import asyncHandler from "express-async-handler";
import {
  createProjectService,
  getProjectsService,
  getProjectByIdService,
  updateProjectService,
  deleteProjectService,
  toggleProjectActiveService,
} from "./project.service.js";

export const createProject = asyncHandler(async (req, res) => {
  const result = await createProjectService(req.body, req.user._id);
  res.status(201).json(result);
});

export const getProjects = asyncHandler(async (req, res) => {
  const result = await getProjectsService(req.query, req.user);
  res.json(result);
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await getProjectByIdService(req.params.id, req.user);
  res.json({ data: project });
});

export const updateProject = asyncHandler(async (req, res) => {
  const result = await updateProjectService(req.params.id, req.body);
  res.json(result);
});

export const deleteProject = asyncHandler(async (req, res) => {
  const result = await deleteProjectService(req.params.id);
  res.json(result);
});

export const toggleProjectActive = asyncHandler(async (req, res) => {
  const result = await toggleProjectActiveService(req.params.id);
  res.json(result);
});
