import express from "express";
import { authenticateToken } from "../middleware/verify.middleware.js";
import { authorizeRole } from "../middleware/authorization.middleware.js";
import {
  createExpenseDraftOrSubmit,
  getCompanyEmployeesForExpense,
  getSupportedCurrenciesForExpense,
  getExpenseById,
  getMyExpenses,
  submitDraftExpense,
  updateDraftExpense,
} from "../controllers/expense.controller.js";

const router = express.Router();

/**
 * GET /api/expenses/mine
 * EMPLOYEE: list own expenses with amount summary by status
 */
router.get("/mine", authenticateToken, authorizeRole("EMPLOYEE"), getMyExpenses);

/**
 * POST /api/expenses
 * EMPLOYEE: create draft or submit expense
 */
router.post("/", authenticateToken, authorizeRole("EMPLOYEE"), createExpenseDraftOrSubmit);

/**
 * PATCH /api/expenses/:expenseId
 * EMPLOYEE: update own draft expense
 */
router.patch("/:expenseId", authenticateToken, authorizeRole("EMPLOYEE"), updateDraftExpense);

/**
 * PATCH /api/expenses/:expenseId/submit
 * EMPLOYEE: submit own draft expense
 */
router.patch("/:expenseId/submit", authenticateToken, authorizeRole("EMPLOYEE"), submitDraftExpense);

/**
 * GET /api/expenses/employees
 * EMPLOYEE: list active employees in same company for paid-by dropdown
 */
router.get("/employees", authenticateToken, authorizeRole("EMPLOYEE"), getCompanyEmployeesForExpense);

/**
 * GET /api/expenses/currencies
 * EMPLOYEE: list supported currencies from key-based exchange API
 */
router.get("/currencies", authenticateToken, authorizeRole("EMPLOYEE"), getSupportedCurrenciesForExpense);

/**
 * GET /api/expenses/:expenseId
 * EMPLOYEE: fetch own expense details + approval history
 */
router.get("/:expenseId", authenticateToken, authorizeRole("EMPLOYEE"), getExpenseById);

export default router;
