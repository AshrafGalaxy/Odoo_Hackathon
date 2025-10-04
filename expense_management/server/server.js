// server.js: Main server file. Initializes Express, sets up middleware, and connects routes.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./api/auth");
const expenseRoutes = require("./api/expenses");
const adminRoutes = require("./api/admin");

const app = express();

// Middleware
app.use(cors()); // Allows cross-origin requests from our frontend
app.use(express.json()); // Parses incoming JSON requests

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} 🚀`);
});
