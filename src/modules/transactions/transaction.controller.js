import asyncHandler from "express-async-handler";
import {
  createTransactionService,
  deleteTransactionService,
  getTransactionByIdService,
  getTransactionsService,
  updateTransactionService,
  createClientPaymentService,
  createEmployeePaymentService,
  createExpenseService,
  exportTransactionsService,
} from "./transaction.service.js";

// ================== TRANSACTION CRUD ==================

export const createTransaction = asyncHandler(async (req, res) => {
  const result = await createTransactionService(req.body, req.user._id);
  res.status(201).json(result);
});

export const getTransactions = asyncHandler(async (req, res) => {
  const result = await getTransactionsService(req.query);
  res.json(result);
});

export const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await getTransactionByIdService(req.params.id);
  res.json({ data: transaction });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const result = await updateTransactionService(req.params.id, req.body);
  res.json(result);
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const result = await deleteTransactionService(req.params.id);
  res.json(result);
});

// ================== SHORTHAND ENDPOINTS ==================

export const createClientPayment = asyncHandler(async (req, res) => {
  const result = await createClientPaymentService(req.body, req.user._id);
  res.status(201).json(result);
});

export const createEmployeePayment = asyncHandler(async (req, res) => {
  const result = await createEmployeePaymentService(req.body, req.user._id);
  res.status(201).json(result);
});

export const createExpense = asyncHandler(async (req, res) => {
  const result = await createExpenseService(req.body, req.user._id);
  res.status(201).json(result);
});

// ================== EXPORT ==================

export const exportTransactions = asyncHandler(async (req, res) => {
  const { workbook, downloadName } = await exportTransactionsService(req.query);
  
  // Set headers for file download
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Glitci-Report.xlsx"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
  );

  await workbook.xlsx.write(res);
  res.end();
});
