// src/modules/tasks/task.routes.js
import { Router } from "express";
import {
  createTasks,
  getTasks,
  updateTaskStatus,
  getTaskAnalytics,
} from "./task.controller.js";
import {
  createTaskValidator,
  getTasksValidator,
  updateTaskStatusValidator,
  taskAnalyticsValidator,
} from "./task.validator.js";
import { protect, allowedTo } from "../auth/auth.middleware.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";

const router = Router();

router.use(protect);

// GET /tasks/analytics/summary — Analytics (admin/operation only)
// Must be defined BEFORE /:id to avoid route conflict
router.get(
  "/analytics/summary",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  taskAnalyticsValidator,
  getTaskAnalytics,
);

// POST /tasks — Create task(s) (admin/operation only)
router.post(
  "/",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  createTaskValidator,
  createTasks,
);

// GET /tasks — List tasks (all roles, filtered by role in service)
router.get("/", getTasksValidator, getTasks);

// PATCH /tasks/:id/status — Update status (all roles, transition logic in service)
router.patch("/:id/status", updateTaskStatusValidator, updateTaskStatus);

export default router;
