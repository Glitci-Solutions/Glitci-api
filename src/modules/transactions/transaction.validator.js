import { body, param, query } from "express-validator";
import {
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  PAYMENT_METHOD,
} from "../../shared/constants/transaction.enums.js";
import { CURRENCY_VALUES } from "../../shared/constants/currency.enums.js";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";

export const createTransactionValidator = [
  body("type")
    .notEmpty()
    .withMessage("Transaction type is required")
    .isIn(Object.values(TRANSACTION_TYPE))
    .withMessage(
      `Type must be one of: ${Object.values(TRANSACTION_TYPE).join(", ")}`,
    ),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn(Object.values(TRANSACTION_CATEGORY))
    .withMessage(
      `Category must be one of: ${Object.values(TRANSACTION_CATEGORY).join(", ")}`,
    ),

  body("project").optional().isMongoId().withMessage("Invalid project ID"),

  body("client").optional().isMongoId().withMessage("Invalid client ID"),

  body("employee").optional().isMongoId().withMessage("Invalid employee ID"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),

  body("currency")
    .notEmpty()
    .withMessage("Currency is required")
    .isIn(CURRENCY_VALUES)
    .withMessage(`Currency must be one of: ${CURRENCY_VALUES.join(", ")}`),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters")
    .trim(),

  body("date").optional().isISO8601().withMessage("Invalid date format"),

  body("paymentMethod")
    .optional()
    .isIn(Object.values(PAYMENT_METHOD))
    .withMessage(
      `Payment method must be one of: ${Object.values(PAYMENT_METHOD).join(", ")}`,
    ),

  body("reference").optional().trim(),

  body("status")
    .optional()
    .isIn(Object.values(TRANSACTION_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(TRANSACTION_STATUS).join(", ")}`,
    ),

  body("receiptUrl").optional().isURL().withMessage("Invalid receipt URL"),

  body("notes")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters")
    .trim(),

  validatorMiddleware,
];

export const updateTransactionValidator = [
  param("id").isMongoId().withMessage("Invalid transaction ID"),

  body("type")
    .optional()
    .isIn(Object.values(TRANSACTION_TYPE))
    .withMessage(
      `Type must be one of: ${Object.values(TRANSACTION_TYPE).join(", ")}`,
    ),

  body("category")
    .optional()
    .isIn(Object.values(TRANSACTION_CATEGORY))
    .withMessage(
      `Category must be one of: ${Object.values(TRANSACTION_CATEGORY).join(", ")}`,
    ),

  body("project").optional().isMongoId().withMessage("Invalid project ID"),

  body("client").optional().isMongoId().withMessage("Invalid client ID"),

  body("employee").optional().isMongoId().withMessage("Invalid employee ID"),

  body("amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),

  body("currency")
    .optional()
    .isIn(CURRENCY_VALUES)
    .withMessage(`Currency must be one of: ${CURRENCY_VALUES.join(", ")}`),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters")
    .trim(),

  body("date").optional().isISO8601().withMessage("Invalid date format"),

  body("paymentMethod")
    .optional()
    .isIn(Object.values(PAYMENT_METHOD))
    .withMessage(
      `Payment method must be one of: ${Object.values(PAYMENT_METHOD).join(", ")}`,
    ),

  body("reference").optional().trim(),

  body("status")
    .optional()
    .isIn(Object.values(TRANSACTION_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(TRANSACTION_STATUS).join(", ")}`,
    ),

  body("receiptUrl").optional().isURL().withMessage("Invalid receipt URL"),

  body("notes")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters")
    .trim(),

  validatorMiddleware,
];

export const transactionIdValidator = [
  param("id").isMongoId().withMessage("Invalid transaction ID"),

  validatorMiddleware,
];

export const listTransactionsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("type")
    .optional()
    .isIn(Object.values(TRANSACTION_TYPE))
    .withMessage(
      `Type must be one of: ${Object.values(TRANSACTION_TYPE).join(", ")}`,
    ),

  query("category")
    .optional()
    .isIn(Object.values(TRANSACTION_CATEGORY))
    .withMessage(
      `Category must be one of: ${Object.values(TRANSACTION_CATEGORY).join(", ")}`,
    ),

  query("status")
    .optional()
    .isIn(Object.values(TRANSACTION_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(TRANSACTION_STATUS).join(", ")}`,
    ),

  query("project").optional().isMongoId().withMessage("Invalid project ID"),

  query("client").optional().isMongoId().withMessage("Invalid client ID"),

  query("employee").optional().isMongoId().withMessage("Invalid employee ID"),

  query("from")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  query("to")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format"),

  validatorMiddleware,
];

// Shorthand validators for common transactions
export const clientPaymentValidator = [
  body("project")
    .notEmpty()
    .withMessage("Project is required")
    .isMongoId()
    .withMessage("Invalid project ID"),

  body("client")
    .notEmpty()
    .withMessage("Client is required")
    .isMongoId()
    .withMessage("Invalid client ID"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),

  body("currency")
    .notEmpty()
    .withMessage("Currency is required")
    .isIn(CURRENCY_VALUES)
    .withMessage(`Currency must be one of: ${CURRENCY_VALUES.join(", ")}`),

  body("description").optional().isLength({ max: 500 }).trim(),

  body("date").optional().isISO8601().withMessage("Invalid date format"),

  body("paymentMethod").optional().isIn(Object.values(PAYMENT_METHOD)),

  body("reference").optional().trim(),

  validatorMiddleware,
];

export const employeePaymentValidator = [
  body("project").optional().isMongoId().withMessage("Invalid project ID"),

  body("employee")
    .notEmpty()
    .withMessage("Employee is required")
    .isMongoId()
    .withMessage("Invalid employee ID"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),

  body("currency")
    .notEmpty()
    .withMessage("Currency is required")
    .isIn(CURRENCY_VALUES)
    .withMessage(`Currency must be one of: ${CURRENCY_VALUES.join(", ")}`),

  body("category")
    .optional()
    .isIn([TRANSACTION_CATEGORY.EMPLOYEE_BONUS])
    .withMessage(
      "Category can only be employee_bonus (salary is auto-determined)",
    ),

  body("description").optional().isLength({ max: 500 }).trim(),

  body("date").optional().isISO8601().withMessage("Invalid date format"),

  body("paymentMethod")
    .optional()
    .isIn(Object.values(PAYMENT_METHOD))
    .withMessage("Invalid payment method value"),

  validatorMiddleware,
];

export const expenseValidator = [
  body("project").optional().isMongoId().withMessage("Invalid project ID"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn([
      TRANSACTION_CATEGORY.EQUIPMENT,
      TRANSACTION_CATEGORY.SOFTWARE,
      TRANSACTION_CATEGORY.MARKETING,
      TRANSACTION_CATEGORY.OFFICE,
      TRANSACTION_CATEGORY.UTILITIES,
      TRANSACTION_CATEGORY.OTHER_EXPENSE,
    ])
    .withMessage("Invalid expense category"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),

  body("currency")
    .notEmpty()
    .withMessage("Currency is required")
    .isIn(CURRENCY_VALUES)
    .withMessage(`Currency must be one of: ${CURRENCY_VALUES.join(", ")}`),

  body("description")
    .notEmpty()
    .withMessage("Description is required for expenses")
    .isLength({ max: 500 })
    .trim(),

  body("date").optional().isISO8601().withMessage("Invalid date format"),

  body("paymentMethod").optional().isIn(Object.values(PAYMENT_METHOD)),

  body("receiptUrl").optional().isURL().withMessage("Invalid receipt URL"),

  validatorMiddleware,
];
