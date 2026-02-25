import { TransactionModel } from "./transaction.model.js";
import { ProjectModel } from "../projects/project.model.js";
import { ProjectMemberModel } from "../projects/projectMember.model.js";
import { ClientModel } from "../clients/client.model.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { EMPLOYMENT_TYPE } from "../../shared/constants/employee.enums.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { normalizeEnum } from "../../shared/utils/apiFeatures.js";
import { convertToAllCurrencies } from "../../shared/utils/currencyService.js";
import { DEFAULT_CURRENCY } from "../../shared/constants/currency.enums.js";
import {
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  PAYMENT_METHOD,
} from "../../shared/constants/transaction.enums.js";

// ================== TRANSACTION CRUD ==================

export async function createTransactionService(payload, userId) {
  const { project, client, employee, type, category } = payload;

  // Validate references if provided
  const validations = [];
  let projectDoc = null;

  if (project) validations.push(ProjectModel.findById(project));
  if (client) validations.push(ClientModel.findById(client));
  if (employee) validations.push(EmployeeModel.findById(employee));

  if (validations.length > 0) {
    const results = await Promise.all(validations);

    let idx = 0;
    if (project) {
      projectDoc = results[idx];
      if (!projectDoc) {
        throw new ApiError("Project not found", 400);
      }
      idx++;
    }

    if (client && !results[idx]) {
      throw new ApiError("Client not found", 400);
    }
    if (client) idx++;

    if (employee && !results[idx]) {
      throw new ApiError("Employee not found", 400);
    }
  }

  // Cross-validation: client must match project client
  if (project && client && projectDoc) {
    if (projectDoc.client.toString() !== client) {
      throw new ApiError("Client does not belong to this project", 400);
    }
  }

  // Cross-validation: employee must be assigned to project
  if (project && employee) {
    const memberAssignment = await ProjectMemberModel.findOne({
      project,
      employee,
      removedAt: null,
    });
    if (!memberAssignment) {
      throw new ApiError("Employee is not assigned to this project", 400);
    }
  }

  // Validate category matches type
  const incomeCategories = [
    TRANSACTION_CATEGORY.CLIENT_PAYMENT,
    TRANSACTION_CATEGORY.OTHER_INCOME,
  ];

  if (
    type === TRANSACTION_TYPE.INCOME &&
    !incomeCategories.includes(category)
  ) {
    throw new ApiError("Invalid category for income transaction", 400);
  }

  if (
    type === TRANSACTION_TYPE.EXPENSE &&
    incomeCategories.includes(category)
  ) {
    throw new ApiError("Invalid category for expense transaction", 400);
  }

  // Convert amount to all currencies
  const currency = payload.currency || DEFAULT_CURRENCY;
  const amountConverted = await convertToAllCurrencies(
    payload.amount,
    currency,
  );

  const transaction = await TransactionModel.create({
    ...payload,
    currency,
    amountConverted,
    addedBy: userId,
  });

  return { message: "Transaction created successfully", id: transaction._id };
}

export async function getTransactionsService(query) {
  const {
    page = 1,
    limit = 10,
    type,
    category,
    status,
    project,
    client,
    employee,
    paymentMethod,
    startDate,
    endDate,
  } = query;

  const filter = {};

  // Normalize enums (case-insensitive)
  const normalizedType = normalizeEnum(type, TRANSACTION_TYPE);
  const normalizedCategory = normalizeEnum(category, TRANSACTION_CATEGORY);
  const normalizedStatus = normalizeEnum(status, TRANSACTION_STATUS);
  const normalizedMethod = normalizeEnum(paymentMethod, PAYMENT_METHOD);

  if (normalizedType) filter.type = normalizedType;
  if (normalizedCategory) filter.category = normalizedCategory;
  if (normalizedStatus) filter.status = normalizedStatus;
  if (project) filter.project = project;
  if (client) filter.client = client;
  if (employee) filter.employee = employee;
  if (normalizedMethod) filter.paymentMethod = normalizedMethod;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    TransactionModel.find(filter)
      .populate("project", "name")
      .populate("client", "name companyName")
      .populate({
        path: "employee",
        populate: { path: "user", select: "name email" },
      })
      .populate("addedBy", "name email")
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    TransactionModel.countDocuments(filter),
  ]);

  return {
    totalPages: Math.ceil(total / limit),
    page: Number(page),
    limit: Number(limit),
    results: total,
    data: transactions,
  };
}

export async function getTransactionByIdService(id) {
  const transaction = await TransactionModel.findById(id)
    .populate("project", "name budget")
    .populate("client", "name companyName email")
    .populate({
      path: "employee",
      populate: [
        { path: "user", select: "name email phone" },
        { path: "position", select: "name" },
      ],
    })
    .populate("addedBy", "name email")
    .lean();

  if (!transaction) {
    throw new ApiError("Transaction not found", 404);
  }

  return transaction;
}

export async function updateTransactionService(id, payload) {
  const transaction = await TransactionModel.findById(id);

  if (!transaction) {
    throw new ApiError("Transaction not found", 404);
  }

  // Don't allow changing type/category on completed transactions
  if (
    transaction.status === "completed" &&
    (payload.type || payload.category)
  ) {
    throw new ApiError(
      "Cannot change type or category of completed transaction",
      400,
    );
  }

  // Re-convert amount if amount or currency changed
  const updateData = { ...payload };
  if (payload.amount !== undefined || payload.currency !== undefined) {
    const newCurrency =
      payload.currency || transaction.currency || DEFAULT_CURRENCY;
    const newAmount =
      payload.amount !== undefined ? payload.amount : transaction.amount;
    updateData.currency = newCurrency;
    updateData.amountConverted = await convertToAllCurrencies(
      newAmount,
      newCurrency,
    );
  }

  await TransactionModel.findByIdAndUpdate(id, updateData, {
    runValidators: true,
  });

  return { message: "Transaction updated successfully" };
}

export async function deleteTransactionService(id) {
  const transaction = await TransactionModel.findById(id);

  if (!transaction) {
    throw new ApiError("Transaction not found", 404);
  }

  await TransactionModel.findByIdAndDelete(id);

  return { message: "Transaction deleted successfully" };
}

// ================== SHORTHAND TRANSACTION CREATORS ==================

export async function createClientPaymentService(payload, userId) {
  const {
    project,
    client,
    amount,
    description,
    date,
    paymentMethod,
    reference,
  } = payload;

  // Validate project and client
  const [projectDoc, clientDoc] = await Promise.all([
    ProjectModel.findById(project),
    ClientModel.findById(client),
  ]);

  if (!projectDoc) {
    throw new ApiError("Project not found or inactive", 400);
  }

  if (!clientDoc || !clientDoc.isActive) {
    throw new ApiError("Client not found or inactive", 400);
  }

  // Verify client matches project
  if (projectDoc.client.toString() !== client) {
    throw new ApiError("Client does not match project client", 400);
  }

  // Convert amount to all currencies
  const currency = payload.currency || DEFAULT_CURRENCY;
  const amountConverted = await convertToAllCurrencies(amount, currency);

  const transaction = await TransactionModel.create({
    type: TRANSACTION_TYPE.INCOME,
    category: TRANSACTION_CATEGORY.CLIENT_PAYMENT,
    project,
    client,
    amount,
    currency,
    amountConverted,
    description: description || `Payment for project: ${projectDoc.name}`,
    date: date || new Date(),
    paymentMethod,
    reference,
    addedBy: userId,
  });

  return { message: "Client payment recorded", id: transaction._id };
}

export async function createEmployeePaymentService(payload, userId) {
  const {
    project,
    employee,
    amount,
    category,
    description,
    date,
    paymentMethod,
    reference,
  } = payload;

  // Validate employee exists
  const employeeDoc = await EmployeeModel.findById(employee).populate("user");
  if (!employeeDoc || !employeeDoc.user?.isActive) {
    throw new ApiError("Employee not found or inactive", 400);
  }

  // Auto-determine category based on employment type
  let resolvedCategory;
  if (category === TRANSACTION_CATEGORY.EMPLOYEE_BONUS) {
    // Bonus keeps its category — project linkage determines project vs company expense
    resolvedCategory = TRANSACTION_CATEGORY.EMPLOYEE_BONUS;
  } else if (employeeDoc.employmentType === EMPLOYMENT_TYPE.FREELANCER) {
    resolvedCategory = TRANSACTION_CATEGORY.EMPLOYEE_PAYMENT;
  } else {
    // FULL_TIME / PART_TIME
    resolvedCategory = TRANSACTION_CATEGORY.EMPLOYEE_SALARY;
  }

  // Freelancers require a project
  if (resolvedCategory === TRANSACTION_CATEGORY.EMPLOYEE_PAYMENT && !project) {
    throw new ApiError("Project is required for freelancer payments", 400);
  }

  // Validate project if provided
  if (project) {
    const projectDoc = await ProjectModel.findById(project);
    if (!projectDoc) {
      throw new ApiError("Project not found or inactive", 400);
    }

    // Verify employee is assigned to this project
    const memberAssignment = await ProjectMemberModel.findOne({
      project,
      employee,
      removedAt: null,
    });
    if (!memberAssignment) {
      throw new ApiError("Employee is not assigned to this project", 400);
    }
  }

  // Convert amount to all currencies
  const currency = payload.currency || DEFAULT_CURRENCY;
  const amountConverted = await convertToAllCurrencies(amount, currency);

  const transaction = await TransactionModel.create({
    type: TRANSACTION_TYPE.EXPENSE,
    category: resolvedCategory,
    project,
    employee,
    amount,
    currency,
    amountConverted,
    description: description || `Payment to ${employeeDoc.user.name}`,
    date: date || new Date(),
    paymentMethod,
    reference,
    addedBy: userId,
  });

  return { message: "Employee payment recorded", id: transaction._id };
}

export async function createExpenseService(payload, userId) {
  const {
    category,
    amount,
    description,
    date,
    paymentMethod,
    receiptUrl,
    reference,
  } = payload;
  let { project } = payload;

  // Validate project if provided
  if (project) {
    const projectDoc = await ProjectModel.findById(project);
    if (!projectDoc) {
      throw new ApiError("Project not found or inactive", 400);
    }
  }

  // Convert amount to all currencies
  const currency = payload.currency || DEFAULT_CURRENCY;
  const amountConverted = await convertToAllCurrencies(amount, currency);

  const transaction = await TransactionModel.create({
    type: TRANSACTION_TYPE.EXPENSE,
    category,
    project,
    amount,
    currency,
    amountConverted,
    description,
    date: date || new Date(),
    paymentMethod,
    receiptUrl,
    reference,
    addedBy: userId,
  });

  return { message: "Expense recorded", id: transaction._id };
}
