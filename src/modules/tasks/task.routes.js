// src/modules/tasks/task.routes.js
import { Router } from "express";
import {
  createTasks,
  getTasks,
  updateTaskStatus,
  getTaskAnalytics,
  updateTask,
  deleteTask,
  addTaskComment,
} from "./task.controller.js";
import {
  createTaskValidator,
  getTasksValidator,
  updateTaskStatusValidator,
  taskAnalyticsValidator,
  updateTaskValidator,
  deleteTaskValidator,
  addTaskCommentValidator,
} from "./task.validator.js";
import { protect, allowedTo } from "../auth/auth.middleware.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";

const router = Router();

router.use(protect);

// GET /tasks/analytics/summary — Analytics (all roles, role-filtered in service)
// Must be defined BEFORE /:id to avoid route conflict
router.get(
  "/analytics/summary",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
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

// GET /tasks — List tasks
router.get(
  "/",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  getTasksValidator,
  getTasks,
);

// PATCH /tasks/:id/status — Update status
router.patch(
  "/:id/status",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  updateTaskStatusValidator,
  updateTaskStatus,
);

// PATCH /tasks/:id — Update task details (admin/operation only)
router.patch(
  "/:id",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  updateTaskValidator,
  updateTask,
);

// DELETE /tasks/:id — Delete task (admin/operation only)
router.delete(
  "/:id",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  deleteTaskValidator,
  deleteTask,
);

// POST /tasks/:id/comments — Add a comment
router.post(
  "/:id/comments",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION, USER_ROLES.EMPLOYEE),
  addTaskCommentValidator,
  addTaskComment,
);

export default router;
