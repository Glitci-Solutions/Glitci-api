import { Router } from "express";
import {
  getProjectFinancials,
  getProjectEmployeeBreakdown,
  getClientPaymentHistory,
  getProjectOtherExpensesBreakdown,
} from "./finance.controller.js";
import { protect, allowedTo } from "../auth/auth.middleware.js";
import { projectIdValidator } from "./finance.validator.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";

const router = Router();

router.use(protect);

// Project-specific financials
router.get(
  "/project/:projectId",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  projectIdValidator,
  getProjectFinancials,
);

// Project employee payments breakdown
router.get(
  "/project/:projectId/payments/employees",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  projectIdValidator,
  getProjectEmployeeBreakdown,
);

// Project client payment history
router.get(
  "/project/:projectId/payments/client",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  projectIdValidator,
  getClientPaymentHistory,
);

// Project other expenses breakdown
router.get(
  "/project/:projectId/expenses/other",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  projectIdValidator,
  getProjectOtherExpensesBreakdown,
);

export default router;
