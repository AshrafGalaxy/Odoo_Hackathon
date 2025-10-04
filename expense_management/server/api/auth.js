// auth.js: Defines routes for user authentication (signup/login).
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const fetch = require("node-fetch");

const router = express.Router();

// POST /api/auth/register - User Signup
router.post("/register", async (req, res) => {
  const { name, email, password, companyName, countryCode } = req.body;

  if (!name || !email || !password || !companyName || !countryCode) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // A special check to handle the application's first-ever signup.
    // This user will automatically become the 'admin' for a new company.
    // All subsequent user creation is handled by an admin.

    const userCheck = await db.query("SELECT * FROM users");
    const isFirstUser = userCheck.rows.length === 0;

    let companyId;
    let role = "employee"; // Default role

    if (isFirstUser) {
      role = "admin"; // First user is always an admin
      // Fetch currency from the API based on country code
      const response = await fetch(
        `https://restcountries.com/v3.1/alpha/${countryCode}?fields=currencies`
      );
      const data = await response.json();
      const currencyCode = Object.keys(data.currencies)[0] || "USD";

      // Create the new company
      const newCompany = await db.query(
        "INSERT INTO companies (name, base_currency) VALUES ($1, $2) RETURNING id",
        [companyName, currencyCode]
      );
      companyId = newCompany.rows[0].id;
    } else {
      // For subsequent users, we'd need an invitation system.
      // For the hackathon, we'll assume the admin creates other users.
      // This endpoint is primarily for the first admin signup.
      return res.status(403).json({
        message:
          "Only the first user can register this way. Admins create other users.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      "INSERT INTO users (name, email, password_hash, role, company_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role",
      [name, email, password_hash, role, companyId]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// POST /api/auth/login - User Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const payload = {
      id: user.id,
      role: user.role,
      company_id: user.company_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token, user: payload });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
