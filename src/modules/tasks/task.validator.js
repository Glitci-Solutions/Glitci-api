// src/modules/tasks/task.validator.js
import { check, param, query } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";
import { TASK_STATUS } from "../../shared/constants/task.enums.js";

// --- Shared field rules ---

const nameRule = check("name")
  .notEmpty()
  .withMessage("Task name is required")
  .isLength({ min: 2, max: 200 })
  .withMessage("Task name must be between 2 and 200 characters");

const descriptionRule = check("description")
  .optional()
  .isLength({ max: 2000 })
  .withMessage("Description cannot exceed 2000 characters");

const startTimeRule = check("startTime")
  .notEmpty()
  .withMessage("Start time is required")
  .isISO8601()
  .withMessage("Start time must be a valid ISO 8601 date");

const endTimeRule = check("endTime")
  .notEmpty()
  .withMessage("End time is required")
  .isISO8601()
  .withMessage("End time must be a valid ISO 8601 date")
  .custom((value, { req }) => {
    if (new Date(value) <= new Date(req.body.startTime)) {
      throw new Error("End time must be after start time");
    }
    return true;
  });

const assignedToRule = check("assignedTo")
  .notEmpty()
  .withMessage("Assigned employee is required")
  .isMongoId()
  .withMessage("Invalid employee ID");

const projectRule = check("project")
  .optional()
  .isMongoId()
  .withMessage("Invalid project ID");

const linksRule = check("links")
  .optional()
  .isArray()
  .withMessage("Links must be an array");

const linksNameRule = check("links.*.name")
  .notEmpty()
  .withMessage("Link name is required");

const linksUrlRule = check("links.*.url")
  .notEmpty()
  .withMessage("Link URL is required")
  .isURL()
  .withMessage("Link URL must be a valid URL");

// --- Bulk create: validate array of tasks ---

const tasksArrayRule = check("tasks")
  .isArray({ min: 1 })
  .withMessage("Tasks must be a non-empty array");

const bulkNameRule = check("tasks.*.name")
  .notEmpty()
  .withMessage("Task name is required")
  .isLength({ min: 2, max: 200 })
  .withMessage("Task name must be between 2 and 200 characters");

const bulkDescriptionRule = check("tasks.*.description")
  .optional()
  .isLength({ max: 2000 })
  .withMessage("Description cannot exceed 2000 characters");

const bulkStartTimeRule = check("tasks.*.startTime")
  .notEmpty()
  .withMessage("Start time is required")
  .isISO8601()
  .withMessage("Start time must be a valid ISO 8601 date");

const bulkEndTimeRule = check("tasks.*.endTime")
  .notEmpty()
  .withMessage("End time is required")
  .isISO8601()
  .withMessage("End time must be a valid ISO 8601 date");

const bulkAssignedToRule = check("tasks.*.assignedTo")
  .notEmpty()
  .withMessage("Assigned employee is required")
  .isMongoId()
  .withMessage("Invalid employee ID");

const bulkProjectRule = check("tasks.*.project")
  .optional()
  .isMongoId()
  .withMessage("Invalid project ID");

const bulkLinksRule = check("tasks.*.links")
  .optional()
  .isArray()
  .withMessage("Links must be an array");

const bulkLinksNameRule = check("tasks.*.links.*.name")
  .notEmpty()
  .withMessage("Link name is required");

const bulkLinksUrlRule = check("tasks.*.links.*.url")
  .notEmpty()
  .withMessage("Link URL is required")
  .isURL()
  .withMessage("Link URL must be a valid URL");

// --- Validators ---

export const createTaskValidator = [
  tasksArrayRule,
  bulkNameRule,
  bulkDescriptionRule,
  bulkStartTimeRule,
  bulkEndTimeRule,
  bulkAssignedToRule,
  bulkProjectRule,
  bulkLinksRule,
  bulkLinksNameRule,
  bulkLinksUrlRule,
  validatorMiddleware,
];

export const updateTaskStatusValidator = [
  param("id").isMongoId().withMessage("Invalid task ID"),

  check("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(Object.values(TASK_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(TASK_STATUS).join(", ")}`,
    ),

  validatorMiddleware,
];

export const getTasksValidator = [
  query("date")
    .optional()
    .isDate()
    .withMessage("Date must be a valid date (YYYY-MM-DD)"),

  query("employee").optional().isMongoId().withMessage("Invalid employee ID"),

  query("department")
    .optional()
    .isMongoId()
    .withMessage("Invalid department ID"),

  query("status")
    .optional()
    .isIn(Object.values(TASK_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(TASK_STATUS).join(", ")}`,
    ),

  query("project").optional().isMongoId().withMessage("Invalid project ID"),

  validatorMiddleware,
];

export const taskAnalyticsValidator = [
  query("employee").optional().isMongoId().withMessage("Invalid employee ID"),

  query("project").optional().isMongoId().withMessage("Invalid project ID"),

  query("startDate")
    .optional()
    .isDate()
    .withMessage("Start date must be a valid date (YYYY-MM-DD)"),

  query("endDate")
    .optional()
    .isDate()
    .withMessage("End date must be a valid date (YYYY-MM-DD)"),

  validatorMiddleware,
];

export const updateTaskValidator = [
  param("id").isMongoId().withMessage("Invalid task ID"),
  check("name")
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage("Task name must be between 2 and 200 characters"),
  check("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  check("startTime")
    .optional()
    .isISO8601()
    .withMessage("Start time must be a valid ISO 8601 date"),
  check("endTime")
    .optional()
    .isISO8601()
    .withMessage("End time must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      if (req.body.startTime && new Date(value) <= new Date(req.body.startTime)) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),
  check("assignedTo").optional().isMongoId().withMessage("Invalid employee ID"),
  check("project").optional().isMongoId().withMessage("Invalid project ID"),
  linksRule,
  linksNameRule,
  linksUrlRule,
  validatorMiddleware,
];

export const deleteTaskValidator = [
  param("id").isMongoId().withMessage("Invalid task ID"),
  validatorMiddleware,
];

export const addTaskCommentValidator = [
  param("id").isMongoId().withMessage("Invalid task ID"),
  check("text")
    .notEmpty()
    .withMessage("Comment text is required")
    .isLength({ max: 2000 })
    .withMessage("Comment text cannot exceed 2000 characters"),
  validatorMiddleware,
];
