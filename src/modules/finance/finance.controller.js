import asyncHandler from "express-async-handler";
import {
  getProjectFinancialsService,
  getProjectEmployeeBreakdownService,
  getClientPaymentHistoryService,
  getProjectOtherExpensesBreakdownService,
} from "./finance.service.js";

export const getProjectFinancials = asyncHandler(async (req, res) => {
  const result = await getProjectFinancialsService(req.params.projectId);
  res.json({ data: result });
});

export const getProjectEmployeeBreakdown = asyncHandler(async (req, res) => {
  const result = await getProjectEmployeeBreakdownService(req.params.projectId);
  res.json({ data: result });
});

export const getClientPaymentHistory = asyncHandler(async (req, res) => {
  const result = await getClientPaymentHistoryService(req.params.projectId);
  res.json({ data: result });
});

export const getProjectOtherExpensesBreakdown = asyncHandler(async (req, res) => {
  const result = await getProjectOtherExpensesBreakdownService(req.params.projectId);
  res.json({ data: result });
});
