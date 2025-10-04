// admin.js: Defines routes for admin-only actions.
const express = require("express");
const db = require("../db");
const { authenticateToken, authorizeRole } = require("./middleware");
const router = express.Router();

// GET /api/admin/users - Get all users in the company
router.get(
  "/users",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const users = await db.query(
        "SELECT id, name, email, role, is_special_approver FROM users WHERE company_id = $1",
        [req.user.company_id]
      );
      res.json(users.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// PUT /api/admin/users/:id/set-special - Designate a user as the special approver
router.put(
  "/users/:id/set-special",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    const { id: userIdToSet } = req.params;
    const { company_id } = req.user;
    try {
      // First, set all other users to false to ensure only one special approver
      await db.query(
        "UPDATE users SET is_special_approver = FALSE WHERE company_id = $1",
        [company_id]
      );
      // Now, set the chosen user to true
      await db.query(
        "UPDATE users SET is_special_approver = TRUE WHERE id = $1 AND company_id = $2",
        [userIdToSet, company_id]
      );
      res.json({ message: "Special approver updated successfully." });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

module.exports = router;
