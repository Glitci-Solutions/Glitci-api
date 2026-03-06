// src/modules/users/user.validator.js
import { check, param } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";
import { CURRENCIES } from "../../shared/constants/currency.enums.js";

// ----- Admin Validators -----

export const createUserValidator = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters"),

  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  check("phone").optional().isMobilePhone().withMessage("Invalid phone number"),

  check("role")
    .optional()
    .isIn([USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER, USER_ROLES.OPERATION])
    .withMessage("Invalid role"),

  validatorMiddleware,
];

export const updateUserValidator = [
  param("id").isMongoId().withMessage("Invalid user ID"),

  check("name")
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters"),

  check("email").optional().isEmail().withMessage("Invalid email format"),

  check("phone").optional().isMobilePhone().withMessage("Invalid phone number"),

  check("role")
    .optional()
    .isIn([USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER, USER_ROLES.OPERATION])
    .withMessage("Invalid role"),

  check("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),

  validatorMiddleware,
];

export const updateUserPasswordValidator = [
  param("id").isMongoId().withMessage("Invalid user ID"),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  validatorMiddleware,
];

export const userIdValidator = [
  param("id").isMongoId().withMessage("Invalid user ID"),

  validatorMiddleware,
];

// ----- Logged-in User Validators -----

export const updateMeValidator = [
  check("name")
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters"),

  check("email").optional().isEmail().withMessage("Invalid email format"),

  check("phone").optional().isMobilePhone().withMessage("Invalid phone number"),

  check("currency")
    .optional()
    .toUpperCase()
    .isIn(CURRENCIES)
    .withMessage("ivalid currency"),

  check("skills").optional().isArray().withMessage("Skills must be an array"),

  check("skills.*").optional().isMongoId().withMessage("Invalid skill ID"),

  validatorMiddleware,
];
