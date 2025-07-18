const express = require("express");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const esClient = require("../elasticsearch/client");

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to protect routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: "Token missing" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// Create Article + index in Elasticsearch with category name
router.post("/", authenticateToken, async (req, res) => {
  const { title, content, categoryId } = req.body;

  try {
    // Create article in DB
    const article = await prisma.article.create({
      data: {
        title,
        content,
        categoryId,
        authorId: req.user.userId,
      },
      include: { category: true }, // Include category info here
    });

    // Index in Elasticsearch including category name
    await esClient.index({
      index: "articles",
      id: article.id.toString(),
      refresh: true,
      document: {
        title,
        content,
        categoryId,
        categoryName: article.category.name, // Add category name here
        authorId: req.user.userId,
      },
    });

    res.status(201).json(article);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create article" });
  }
});

// Get all articles with pagination (unchanged)
router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        skip,
        take: limit,
        include: {
          author: { select: { id: true, email: true } },
          category: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.article.count(),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      articles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch articles" });
  }
});

// Search articles using Elasticsearch including categoryName field
router.get("/search", async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: "Search query missing" });
  }

  try {
    const result = await esClient.search({
      index: "articles",
      query: {
        multi_match: {
          query,
          fields: ["title", "content", "categoryName"], // Add categoryName here
        },
      },
    });

    const hits = result.hits.hits.map((hit) => ({
      id: hit._id,
      ...hit._source,
    }));

    res.json(hits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

// Reindex all articles from DB to Elasticsearch including category name
router.post("/reindex", authenticateToken, async (req, res) => {
  try {
    const articles = await prisma.article.findMany({ include: { category: true } });

    const body = articles.flatMap(article => [
      { index: { _index: "articles", _id: article.id.toString() } },
      {
        title: article.title,
        content: article.content,
        categoryId: article.categoryId,
        categoryName: article.category.name, // Include category name here
        authorId: article.authorId,
      }
    ]);

    await esClient.bulk({ refresh: true, body });

    res.json({ message: "Reindexing completed", count: articles.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Reindexing failed" });
  }
});

// Get article by ID (unchanged)
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const article = await prisma.article.findUnique({
      where: { id: parseInt(id) },
      include: {
        author: { select: { id: true, email: true } },
        category: true,
      },
    });
    if (!article) return res.status(404).json({ error: "Article not found" });
    res.json(article);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching article" });
  }
});

// Update article (unchanged)
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, content, categoryId } = req.body;

  try {
    const updated = await prisma.article.update({
      where: { id: parseInt(id) },
      data: {
        title,
        content,
        categoryId,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update article" });
  }
});

// Delete article + delete from Elasticsearch (unchanged)
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.article.delete({
      where: { id: parseInt(id) },
    });

    await esClient.delete({
      index: "articles",
      id: id.toString(),
      refresh: true,
    });

    res.json({ message: "Article deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete article" });
  }
});

module.exports = router;
