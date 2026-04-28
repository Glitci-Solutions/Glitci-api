// src/modules/employees/employee.routes.js
import { Router } from "express";
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  toggleEmployeeActive,
  deleteEmployee,
} from "./employee.controller.js";
import {
  createEmployeeValidator,
  updateEmployeeValidator,
  employeeIdValidator,
} from "./employee.validator.js";
import { protect, allowedTo } from "../auth/auth.middleware.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";

const router = Router();

router.use(protect);

// GET /employees - List employees (isActive=true by default)
router.get("/", getEmployees);

// POST /employees - Create employee
router.post(
  "/",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  createEmployeeValidator,
  createEmployee,
);

// GET /employees/:id - Get single employee
router.get(
  "/:id",
  employeeIdValidator,
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.MANAGER),
  getEmployee,
);

// PATCH /employees/:id - Update employee
router.patch(
  "/:id",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  updateEmployeeValidator,
  updateEmployee,
);

// PATCH /employees/:id/toggle-active - Toggle employee status
router.patch(
  "/:id/toggle-active",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  employeeIdValidator,
  toggleEmployeeActive,
);

// DELETE /employees/:id - Delete employee permanently
router.delete(
  "/:id",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  employeeIdValidator,
  deleteEmployee,
);

export default router;
