// expenses.js: Defines routes for creating, viewing, and managing expenses.
const express = require("express");
const db = require("../db");
const fetch = require("node-fetch");
const { authenticateToken, authorizeRole } = require("./middleware");
const router = express.Router();

// POST /api/expenses - Submit a new expense (Employee)
router.post(
  "/",
  authenticateToken,
  authorizeRole("employee"),
  async (req, res) => {
    const { amount, currency, category, description } = req.body;
    const { id: employee_id, company_id } = req.user;

    try {
      const managerResult = await db.query(
        "SELECT manager_id FROM users WHERE id = $1",
        [employee_id]
      );
      const manager_id = managerResult.rows[0]?.manager_id;

      if (!manager_id) {
        return res.status(400).json({
          message: "You don't have a manager assigned. Contact your admin.",
        });
      }

      const newExpense = await db.query(
        `INSERT INTO expenses (employee_id, company_id, amount, currency, category, description, current_approver_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          employee_id,
          company_id,
          amount,
          currency,
          category,
          description,
          manager_id,
        ]
      );

      res.status(201).json(newExpense.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// GET /api/expenses/my-expenses - View own expense history (Employee)
router.get(
  "/my-expenses",
  authenticateToken,
  authorizeRole("employee"),
  async (req, res) => {
    try {
      const expenses = await db.query(
        "SELECT id, amount, currency, category, status, created_at FROM expenses WHERE employee_id = $1 ORDER BY created_at DESC",
        [req.user.id]
      );
      res.json(expenses.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// GET /api/expenses/pending - Get expenses waiting for my approval (Manager or Director)
router.get(
  "/pending",
  authenticateToken,
  authorizeRole(["manager", "director"]),
  async (req, res) => {
    try {
      const company = await db.query(
        "SELECT base_currency FROM companies WHERE id = $1",
        [req.user.company_id]
      );
      const baseCurrency = company.rows[0].base_currency;

      // Fetch the latest conversion rates
      const ratesResponse = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
      );
      const ratesData = await ratesResponse.json();
      const rates = ratesData.rates;

      const expensesResult = await db.query(
        `SELECT e.id, e.amount, e.currency, e.category, e.description, u.name as employee_name, e.created_at
             FROM expenses e
             JOIN users u ON e.employee_id = u.id
             WHERE e.current_approver_id = $1 AND e.status = 'pending'`,
        [req.user.id]
      );

      // Add the converted amount to each expense
      const expensesWithConversion = expensesResult.rows.map((expense) => {
        let convertedAmount = null; // Use null if no conversion is needed/possible
        if (expense.currency !== baseCurrency && rates[expense.currency]) {
          // The API gives rate based on 1 unit of base currency. So formula is amount / rate.
          convertedAmount = (expense.amount / rates[expense.currency]).toFixed(
            2
          );
        }
        return { ...expense, convertedAmount, baseCurrency };
      });

      res.json(expensesWithConversion);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// PUT /api/expenses/:id/approve - Approve an expense (Manager or Director)
router.put(
  "/:id/approve",
  authenticateToken,
  authorizeRole(["manager", "director"]),
  async (req, res) => {
    const { id: expense_id } = req.params;
    const { comments } = req.body;
    const { id: approver_id } = req.user;

    try {
      /*
       * This block handles the multi-level approval process.
       * 1. It first verifies that the expense exists and the current user is the designated approver.
       * 2. It logs the current user's approval action in the 'approvals' table.
       * 3. It then checks the 'approval_steps' table to see if there is a next step in the sequence.
       * 4. If a next step exists, it finds the next approver (e.g., the director) and reassigns the expense to them.
       * 5. If this is the final step, it updates the expense status to 'approved'.
       */
      const expenseResult = await db.query(
        "SELECT * FROM expenses WHERE id = $1 AND current_approver_id = $2",
        [expense_id, approver_id]
      );
      if (expenseResult.rows.length === 0) {
        return res.status(404).json({
          message: "Expense not found or you're not the current approver.",
        });
      }
      const expense = expenseResult.rows[0];

      await db.query(
        "INSERT INTO approvals (expense_id, approver_id, status, comments) VALUES ($1, $2, 'approved', $3)",
        [expense_id, approver_id, comments]
      );
      // --- NEW LOGIC: Check for Special Approver ---
      const approverCheck = await db.query(
        "SELECT is_special_approver FROM users WHERE id = $1",
        [approver_id]
      );
      if (approverCheck.rows[0].is_special_approver) {
        // This is a special approver, so auto-approve the expense and finish.
        await db.query(
          "UPDATE expenses SET status = 'approved', current_approver_id = NULL WHERE id = $1",
          [expense_id]
        );
        return res.json({
          message: "Expense approved by special approver (final).",
        });
      }
      const currentUser = await db.query(
        "SELECT role FROM users WHERE id = $1",
        [approver_id]
      );
      const currentRole = currentUser.rows[0].role;

      const currentStepResult = await db.query(
        "SELECT sequence FROM approval_steps WHERE company_id = $1 AND approver_role = $2",
        [expense.company_id, currentRole]
      );
      const currentSequence = currentStepResult.rows[0].sequence;

      const nextStepResult = await db.query(
        "SELECT approver_role FROM approval_steps WHERE company_id = $1 AND sequence = $2",
        [expense.company_id, currentSequence + 1]
      );

      if (nextStepResult.rows.length > 0) {
        const nextApproverRole = nextStepResult.rows[0].approver_role;
        const nextApprover = await db.query(
          "SELECT id FROM users WHERE company_id = $1 AND role = $2 LIMIT 1",
          [expense.company_id, nextApproverRole]
        );

        if (nextApprover.rows.length > 0) {
          await db.query(
            "UPDATE expenses SET current_approver_id = $1 WHERE id = $2",
            [nextApprover.rows[0].id, expense_id]
          );
          res.json({
            message: `Expense approved and forwarded to ${nextApproverRole}.`,
          });
        } else {
          await db.query(
            "UPDATE expenses SET status = 'approved', current_approver_id = NULL WHERE id = $1",
            [expense_id]
          );
          res.json({
            message: "Expense approved. No approver found for the next step.",
          });
        }
      } else {
        await db.query(
          "UPDATE expenses SET status = 'approved', current_approver_id = NULL WHERE id = $1",
          [expense_id]
        );
        res.json({ message: "Expense approved successfully (final step)." });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// PUT /api/expenses/:id/reject - Reject an expense (Manager or Director)
router.put(
  "/:id/reject",
  authenticateToken,
  authorizeRole(["manager", "director"]),
  async (req, res) => {
    const { id: expense_id } = req.params;
    const { comments } = req.body;
    const { id: approver_id } = req.user;
    try {
      const updatedExpense = await db.query(
        "UPDATE expenses SET status = 'rejected', current_approver_id = NULL WHERE id = $1 AND current_approver_id = $2 RETURNING *",
        [expense_id, approver_id]
      );

      if (updatedExpense.rows.length === 0) {
        return res.status(404).json({
          message: "Expense not found or you're not the current approver.",
        });
      }

      await db.query(
        "INSERT INTO approvals (expense_id, approver_id, status, comments) VALUES ($1, $2, 'rejected', $3)",
        [expense_id, approver_id, comments]
      );

      res.json({ message: "Expense rejected successfully." });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

module.exports = router;
