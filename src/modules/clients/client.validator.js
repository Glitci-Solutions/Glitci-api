// src/modules/clients/client.validator.js
import { check, param } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";

export const createClientValidator = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  check("companyName")
    .notEmpty()
    .withMessage("Company name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name must be between 2 and 100 characters"),

  check("email").optional(),

  check("phones").optional().isArray().withMessage("Phones must be an array"),

  check("phones.*").optional(),

  check("industry")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Industry must be at most 50 characters"),

  check("notes")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Notes must be at most 1000 characters"),

  validatorMiddleware,
];

export const updateClientValidator = [
  param("id").isMongoId().withMessage("Invalid client ID"),

  check("name")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  check("companyName")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name must be between 2 and 100 characters"),

  check("email").optional(),

  check("phones").optional().isArray().withMessage("Phones must be an array"),

  check("phones.*").optional(),

  check("industry")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Industry must be at most 50 characters"),

  check("notes")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Notes must be at most 1000 characters"),

  validatorMiddleware,
];

export const clientIdValidator = [
  param("id").isMongoId().withMessage("Invalid client ID"),

  validatorMiddleware,
];
