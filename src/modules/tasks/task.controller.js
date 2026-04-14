import asyncHandler from "express-async-handler";
import {
  createTasksService,
  getTasksService,
  updateTaskStatusService,
  getTaskAnalyticsService,
} from "./task.service.js";

// POST /tasks — Create task(s) (bulk, accepts array)
export const createTasks = asyncHandler(async (req, res) => {
  const result = await createTasksService(req.body.tasks, req.user._id);
  res.status(201).json({
    message: `${result.count} task(s) created successfully`,
    ...result,
  });
});

// GET /tasks — List tasks (role-filtered)
export const getTasks = asyncHandler(async (req, res) => {
  const result = await getTasksService(req.query, req.user);
  res.status(200).json(result);
});

// PATCH /tasks/:id/status — Update task status
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await updateTaskStatusService(
    req.params.id,
    req.body.status,
    req.user,
  );
  res.status(200).json({ message: "Task status updated successfully", data: task });
});

// GET /tasks/analytics/summary — Task analytics
export const getTaskAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getTaskAnalyticsService(req.query);
  res.status(200).json({ data: analytics });
});
