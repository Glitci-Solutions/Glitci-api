import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  getTransactions,
  updateTransaction,
  createClientPayment,
  createEmployeePayment,
  createExpense,
  exportTransactions,
} from "./transaction.controller.js";
import { protect, allowedTo } from "../auth/auth.middleware.js";
import {
  createTransactionValidator,
  updateTransactionValidator,
  transactionIdValidator,
  listTransactionsValidator,
  clientPaymentValidator,
  employeePaymentValidator,
  expenseValidator,
} from "./transaction.validator.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";

const router = Router();

// All routes require authentication
router.use(protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.MANAGER));

// Shorthand endpoints (for convenience)
router.post("/client-payment", clientPaymentValidator, createClientPayment);

router.post(
  "/employee-payment",
  employeePaymentValidator,
  createEmployeePayment,
);

router.post("/expense", expenseValidator, createExpense);

// Export (on-demand, filtered)
router.get("/export", listTransactionsValidator, exportTransactions);

// Generic CRUD
router
  .route("/")
  .get(listTransactionsValidator, getTransactions)
  .post(createTransactionValidator, createTransaction);

router
  .route("/:id")
  .get(transactionIdValidator, getTransaction)
  .patch(updateTransactionValidator, updateTransaction)
  .delete(transactionIdValidator, deleteTransaction);

export default router;
