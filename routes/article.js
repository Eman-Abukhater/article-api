const express = require("express");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

//  Middleware to protect routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Get token from Bearer TOKEN

  if (!token) return res.status(401).json({ error: "Token missing" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

//  Create Article
router.post("/", authenticateToken, async (req, res) => {
  const { title, content, categoryId } = req.body;

  try {
    const article = await prisma.article.create({
      data: {
        title,
        content,
        categoryId,
        authorId: req.user.userId,
      },
    });
    res.status(201).json(article);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create article" });
  }
});

// Get All Articles
router.get("/", async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      include: {
        author: { select: { id: true, email: true } },
        category: true,
      },
    });
    res.json(articles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch articles" });
  }
});

// ✅ Get Article by ID
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

//  Update Article
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

// Delete Article
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.article.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: "Article deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete article" });
  }
});

module.exports = router;
