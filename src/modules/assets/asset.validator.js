// src/modules/assets/asset.validator.js
import { check, param, query } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";

// --- Validators ---

export const createAssetValidator = [
  check("name")
    .notEmpty()
    .withMessage("Link name is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Link name must be between 2 and 200 characters"),

  check("url")
    .notEmpty()
    .withMessage("Link URL is required")
    .isURL()
    .withMessage("Link URL must be a valid URL"),

  check("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  check("client").optional().isMongoId().withMessage("Invalid client ID"),

  check("project").optional().isMongoId().withMessage("Invalid project ID"),

  validatorMiddleware,
];

export const updateAssetValidator = [
  param("id").isMongoId().withMessage("Invalid asset ID"),

  check("name")
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage("Link name must be between 2 and 200 characters"),

  check("url").optional().isURL().withMessage("Link URL must be a valid URL"),

  check("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  check("client").optional().isMongoId().withMessage("Invalid client ID"),

  check("project").optional().isMongoId().withMessage("Invalid project ID"),

  validatorMiddleware,
];

export const getAssetsValidator = [
  query("client").optional().isMongoId().withMessage("Invalid client ID"),

  query("project").optional().isMongoId().withMessage("Invalid project ID"),

  validatorMiddleware,
];

export const deleteAssetValidator = [
  param("id").isMongoId().withMessage("Invalid asset ID"),
  validatorMiddleware,
];
