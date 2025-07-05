const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// Create category
router.post("/", async (req, res) => {
  const { name } = req.body;
  try {
    const category = await prisma.category.create({ data: { name } });
    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create category" });
  }
});

//  Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch categories" });
  }
});

//  Get category by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const category = await prisma.category.findUnique({ where: { id: parseInt(id) } });
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: "Error fetching category" });
  }
});

// ✏️ Update category
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const updated = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Could not update category" });
  }
});

// Delete category
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.category.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: "Could not delete category" });
  }
});

module.exports = router;
