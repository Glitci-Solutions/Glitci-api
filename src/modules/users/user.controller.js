// src/modules/users/user.controller.js
import asyncHandler from "express-async-handler";
import {
  getUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  updateUserPasswordByAdminService,
  deleteUserService,
  toggleUserActiveService,
  getMeService,
  updateMeService,
  deleteMeService,
} from "./user.service.js";

// ----- Admin Controllers -----

// GET /users
export const getUsers = asyncHandler(async (req, res) => {
  const result = await getUsersService(req.query);
  res.status(200).json(result);
});

// GET /users/:id
export const getUser = asyncHandler(async (req, res) => {
  const user = await getUserByIdService(req.params.id);
  res.status(200).json({ data: user });
});

// POST /users
export const createUser = asyncHandler(async (req, res) => {
  const user = await createUserService(req.body);
  res.status(201).json({
    message: "User created successfully, and email sent with credentials",
    data: user,
  });
});

// PATCH /users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const user = await updateUserService(req.params.id, req.body);
  res.status(200).json({ data: user });
});

// PATCH /users/:id/password
export const updateUserPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await updateUserPasswordByAdminService(req.params.id, password);
  res.status(200).json({ message: "Password updated", data: user });
});

// DELETE /users/:id
export const deleteUser = asyncHandler(async (req, res) => {
  await deleteUserService(req.params.id);
  res.status(200).json({ message: "User deleted successfully" });
});

// PATCH /users/:id/toggle-active
export const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await toggleUserActiveService(req.params.id);
  res.status(200).json({ message: "User status changed", data: user });
});

// ----- Logged-in User Controllers -----

// GET /users/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await getMeService(req.user);
  res.status(200).json({ data: user });
});

// PATCH /users/me
export const updateMe = asyncHandler(async (req, res) => {
  const { name, email, phone, skills, currency } = req.body;

  const user = await updateMeService({
    userId: req.user._id,
    name,
    email,
    phone,
    currency,
    skills,
    imageFile: req.file || null,
  });

  res.status(200).json({ data: user });
});

// DELETE /users/me
export const deleteMe = asyncHandler(async (req, res) => {
  await deleteMeService({ userId: req.user._id });
  res.status(200).json({ message: "Account deactivated successfully" });
});
