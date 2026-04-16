import { body, param, query } from "express-validator";
import {
  PROJECT_STATUS,
  PROJECT_PRIORITY,
} from "../../shared/constants/project.enums.js";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";

// Validators for Project
export const createProjectValidator = [
  body("name")
    .notEmpty()
    .withMessage("Project name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2-100 characters")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters")
    .trim(),

  body("client")
    .notEmpty()
    .withMessage("Client is required")
    .isMongoId()
    .withMessage("Invalid client ID"),

  body("department")
    .notEmpty()
    .withMessage("Department is required")
    .isMongoId()
    .withMessage("Invalid department ID"),

  body("services")
    .optional()
    .isArray()
    .withMessage("Services must be an array"),

  body("services.*").optional().isMongoId().withMessage("Invalid service ID"),

  body("budget")
    .notEmpty()
    .withMessage("Budget is required")
    .isFloat({ min: 0 })
    .withMessage("Budget must be a positive number"),

  body("startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Invalid start date format"),

  body("endDate").optional().isISO8601().withMessage("Invalid end date format"),

  body("priority")
    .optional()
    .isIn(Object.values(PROJECT_PRIORITY))
    .withMessage(
      `Priority must be one of: ${Object.values(PROJECT_PRIORITY).join(", ")}`,
    ),

  body("status")
    .optional()
    .isIn(Object.values(PROJECT_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(PROJECT_STATUS).join(", ")}`,
    ),

  // Employees array for batch creation
  body("employees")
    .optional()
    .isArray()
    .withMessage("Employees must be an array"),

  body("employees.*.employee")
    .notEmpty()
    .withMessage("Employee ID is required")
    .isMongoId()
    .withMessage("Invalid employee ID"),

  body("employees.*.compensation")
    .notEmpty()
    .withMessage("Compensation is required")
    .isFloat({ min: 0 })
    .withMessage("Compensation must be a positive number"),

  validatorMiddleware,
];

export const updateProjectValidator = [
  param("id").isMongoId().withMessage("Invalid project ID"),

  body("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2-100 characters")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters")
    .trim(),

  body("client").optional().isMongoId().withMessage("Invalid client ID"),

  body("department")
    .optional()
    .isMongoId()
    .withMessage("Invalid department ID"),

  body("services")
    .optional()
    .isArray()
    .withMessage("Services must be an array"),

  body("services.*").optional().isMongoId().withMessage("Invalid service ID"),

  body("budget")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Budget must be a positive number"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  body("endDate").optional().isISO8601().withMessage("Invalid end date format"),

  body("priority")
    .optional()
    .isIn(Object.values(PROJECT_PRIORITY))
    .withMessage(
      `Priority must be one of: ${Object.values(PROJECT_PRIORITY).join(", ")}`,
    ),

  body("status")
    .optional()
    .isIn(Object.values(PROJECT_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(PROJECT_STATUS).join(", ")}`,
    ),

  // Employees array for sync (same as create)
  body("employees")
    .optional()
    .isArray()
    .withMessage("Employees must be an array"),

  body("employees.*.employee")
    .notEmpty()
    .withMessage("Employee ID is required")
    .isMongoId()
    .withMessage("Invalid employee ID"),

  body("employees.*.compensation")
    .notEmpty()
    .withMessage("Compensation is required")
    .isFloat({ min: 0 })
    .withMessage("Compensation must be a positive number"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  validatorMiddleware,
];

export const projectIdValidator = [
  param("id").isMongoId().withMessage("Invalid project ID"),

  validatorMiddleware,
];

// Query validator for list operations
export const listProjectsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(Object.values(PROJECT_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(PROJECT_STATUS).join(", ")}`,
    ),

  query("priority")
    .optional()
    .isIn(Object.values(PROJECT_PRIORITY))
    .withMessage(
      `Priority must be one of: ${Object.values(PROJECT_PRIORITY).join(", ")}`,
    ),

  query("client").optional().isMongoId().withMessage("Invalid client ID"),

  query("department")
    .optional()
    .isMongoId()
    .withMessage("Invalid department ID"),

  query("employee").optional().isMongoId().withMessage("Invalid employee ID"),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  validatorMiddleware,
];
