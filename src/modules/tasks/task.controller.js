import asyncHandler from "express-async-handler";
import {
  createTasksService,
  getTasksService,
  updateTaskStatusService,
  getTaskAnalyticsService,
  updateTaskService,
  deleteTaskService,
  addTaskCommentService,
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
  const analytics = await getTaskAnalyticsService(req.query, req.user);
  res.status(200).json({ data: analytics });
});

// PATCH /tasks/:id — Update task details
export const updateTask = asyncHandler(async (req, res) => {
  const task = await updateTaskService(req.params.id, req.body, req.user);
  res.status(200).json({ message: "Task updated successfully", data: task });
});

// DELETE /tasks/:id — Delete task
export const deleteTask = asyncHandler(async (req, res) => {
  await deleteTaskService(req.params.id);
  res.status(200).json({ message: "Task deleted successfully" });
});

// POST /tasks/:id/comments — Add a comment to a task
export const addTaskComment = asyncHandler(async (req, res) => {
  const task = await addTaskCommentService(
    req.params.id,
    req.body.text,
    req.user,
  );
  res.status(201).json({ message: "Comment added successfully", data: task });
});
