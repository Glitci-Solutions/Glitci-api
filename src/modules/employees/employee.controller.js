// src/modules/employees/employee.controller.js
import asyncHandler from "express-async-handler";
import {
  getEmployeesService,
  getEmployeeByIdService,
  createEmployeeService,
  updateEmployeeService,
  toggleEmployeeActiveService,
  deleteEmployeeService,
} from "./employee.service.js";

// GET /employees - List employees (isActive=true by default)
export const getEmployees = asyncHandler(async (req, res) => {
  const result = await getEmployeesService(req.query);
  res.status(200).json(result);
});

// GET /employees/:id - Get single employee
export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await getEmployeeByIdService(req.params.id);
  res.status(200).json({ data: employee });
});

// POST /employees - Create employee
export const createEmployee = asyncHandler(async (req, res) => {
  const { id } = await createEmployeeService(req.body);
  res.status(201).json({
    message: "Employee created successfully, and email sent with credentials",
    id,
  });
});

// PATCH /employees/:id - Update employee
export const updateEmployee = asyncHandler(async (req, res) => {
  await updateEmployeeService(req.params.id, req.body);
  res.status(200).json({ message: "Employee updated successfully" });
});

// PATCH /employees/:id/toggle-active - Toggle employee active status
export const toggleEmployeeActive = asyncHandler(async (req, res) => {
  const { isActive } = await toggleEmployeeActiveService(req.params.id);
  res.status(200).json({ message: "Employee status changed", isActive });
});

// DELETE /employees/:id - Delete employee (permanent)
export const deleteEmployee = asyncHandler(async (req, res) => {
  await deleteEmployeeService(req.params.id);
  res.status(200).json({ message: "Employee deleted successfully" });
});
