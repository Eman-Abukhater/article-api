const express = require("express"); // Express framework for building web applications
const cors = require("cors");// Middleware for enabling CORS (Cross-Origin Resource Sharing) and allowing requests from different origins
const dotenv = require("dotenv"); // Module for loading environment variables from a .env file
const { PrismaClient } = require("@prisma/client");
const authRoutes = require("./routes/auth"); // Import authentication routes
dotenv.config();

const app = express(); // Initialize the Express application
const prisma = new PrismaClient();
app.use("/api/auth", authRoutes);



app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Article API is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
