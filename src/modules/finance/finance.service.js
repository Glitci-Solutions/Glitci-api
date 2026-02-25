import mongoose from "mongoose";
import { ProjectModel } from "../projects/project.model.js";
import { ProjectMemberModel } from "../projects/projectMember.model.js";
import { TransactionModel } from "../transactions/transaction.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import {
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
} from "../../shared/constants/transaction.enums.js";

const { ObjectId } = mongoose.Types;

// ================== PROJECT FINANCIALS ==================

export async function getProjectFinancialsService(projectId) {
  const project = await ProjectModel.findById(projectId)
    .populate("client", "name companyName")
    .lean();

  if (!project) {
    throw new ApiError("Project not found", 404);
  }

  const [
    memberAgg,
    transactionAgg,
    employeePayments,
    clientTransactions,
    employeeTransactions,
  ] = await Promise.all([
    // Total compensation agreed for all members
    ProjectMemberModel.aggregate([
      {
        $match: {
          project: new ObjectId(projectId),
          removedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalCompensation: { $sum: "$compensation" },
          memberCount: { $sum: 1 },
        },
      },
    ]),

    // Sum transactions by type
    TransactionModel.aggregate([
      {
        $match: {
          project: new ObjectId(projectId),
          status: TRANSACTION_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Employee-specific payments
    TransactionModel.aggregate([
      {
        $match: {
          project: new ObjectId(projectId),
          status: TRANSACTION_STATUS.COMPLETED,
          category: {
            $in: [
              TRANSACTION_CATEGORY.EMPLOYEE_SALARY,
              TRANSACTION_CATEGORY.EMPLOYEE_BONUS,
              TRANSACTION_CATEGORY.EMPLOYEE_PAYMENT,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" },
        },
      },
    ]),

    // Client transactions (income) - full details
    // TransactionModel.find({
    //   project: projectId,
    //   type: TRANSACTION_TYPE.INCOME,
    //   status: TRANSACTION_STATUS.COMPLETED,
    // })
    //   .populate("client", "name companyName")
    //   .populate("addedBy", "name email")
    //   .sort({ date: -1 })
    //   .lean(),

    // // Employee transactions - full details
    // TransactionModel.find({
    //   project: projectId,
    //   category: {
    //     $in: [
    //       TRANSACTION_CATEGORY.EMPLOYEE_SALARY,
    //       TRANSACTION_CATEGORY.EMPLOYEE_BONUS,
    //     ],
    //   },
    //   status: TRANSACTION_STATUS.COMPLETED,
    // })
    //   .populate("employee", "user")
    //   .populate({
    //     path: "employee",
    //     populate: { path: "user", select: "name email" },
    //   })
    //   .populate("addedBy", "name email")
    //   .sort({ date: -1 })
    //   .lean(),
  ]);

  const totalCompensation = memberAgg[0]?.totalCompensation || 0;
  const memberCount = memberAgg[0]?.memberCount || 0;
  const income =
    transactionAgg.find((t) => t._id === TRANSACTION_TYPE.INCOME)?.total || 0;
  const totalExpenses =
    transactionAgg.find((t) => t._id === TRANSACTION_TYPE.EXPENSE)?.total || 0;
  const totalPaidToEmployees = employeePayments[0]?.totalPaid || 0;
  const otherExpenses = totalExpenses - totalPaidToEmployees;

  // // Format transaction breakdowns - show ORIGINAL currency for each transaction
  // const formattedClientTransactions = clientTransactions.map((t) => ({
  //   id: t._id,
  //   amount: t.amount,
  //   currency: t.currency || "EGP", // Show original currency
  //   date: t.date,
  //   description: t.description,
  //   category: t.category,
  //   paymentMethod: t.paymentMethod,
  //   reference: t.reference,
  //   client: {
  //     id: t.client?._id,
  //     name: t.client?.name || t.client?.companyName,
  //   },
  //   addedBy: t.addedBy?.name,
  // }));

  // const formattedEmployeeTransactions = employeeTransactions.map((t) => ({
  //   id: t._id,
  //   amount: t.amount,
  //   currency: t.currency || "EGP", // Show original currency
  //   date: t.date,
  //   description: t.description,
  //   category: t.category,
  //   paymentMethod: t.paymentMethod,
  //   employee: {
  //     id: t.employee?._id,
  //     name: t.employee?.user?.name,
  //     email: t.employee?.user?.email,
  //   },
  //   addedBy: t.addedBy?.name,
  // }));

  return {
    project: {
      _id: project._id,
      name: project.name,
      budget: project.budget,
      currency: project.currency || "EGP", // Show project's original currency
      client: project.client,
      status: project.status,
    },
    financials: {
      budget: project.budget,
      budgetCurrency: project.currency || "EGP",
      totalEmployeesCompensation: totalCompensation,
      employeesCount: memberCount,

      // Actual money movement
      moneyCollected: income,
      totalExpenses,
      paidToEmployees: totalPaidToEmployees,
      otherExpenses,

      // Calculated balances
      clientBalanceDue: project.budget - income,
      employeeBalanceDue: totalCompensation - totalPaidToEmployees,

      // Profit calculations
      grossProfit: project.budget - totalCompensation - otherExpenses,
      netProfitToDate: income - totalExpenses,
    },
    // transactions: {
    //   clientTransactions: formattedClientTransactions,
    //   employeeTransactions: formattedEmployeeTransactions,
    // },
  };
}

// ================== EMPLOYEE PAYMENTS BREAKDOWN ==================

export async function getProjectEmployeeBreakdownService(projectId) {
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new ApiError("Project not found", 404);
  }

  // Get all active members
  const members = await ProjectMemberModel.find({
    project: projectId,
    removedAt: null,
  })
    .populate({
      path: "employee",
      populate: [
        { path: "user", select: "name email" },
        { path: "position", select: "name" },
      ],
    })
    .lean();

  // Get all employee payments for this project (full details)
  const employeePayments = await TransactionModel.find({
    project: new ObjectId(projectId),
    status: TRANSACTION_STATUS.COMPLETED,
    category: {
      $in: [
        TRANSACTION_CATEGORY.EMPLOYEE_SALARY,
        TRANSACTION_CATEGORY.EMPLOYEE_BONUS,
        TRANSACTION_CATEGORY.EMPLOYEE_PAYMENT,
      ],
    },
    employee: { $ne: null },
  })
    .populate("addedBy", "name")
    .sort({ date: -1 })
    .lean();

  // Group payments by employee
  const paymentsByEmployee = {};
  employeePayments.forEach((payment) => {
    const empId = payment.employee.toString();
    if (!paymentsByEmployee[empId]) {
      paymentsByEmployee[empId] = [];
    }
    paymentsByEmployee[empId].push({
      id: payment._id,
      amount: payment.amount,
      currency: payment.currency || "EGP",
      date: payment.date,
      description: payment.description,
      category: payment.category,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      addedBy: payment.addedBy?.name,
    });
  });

  // Build breakdown - show original currency for each member
  const breakdown = members.map((member) => {
    const empId = member.employee._id.toString();
    const payments = paymentsByEmployee[empId] || [];
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      employee: {
        id: member.employee._id,
        name: member.employee.user?.name || "Unknown",
        email: member.employee.user?.email,
        position: member.employee.position?.name,
      },
      compensation: member.compensation,
      currency: member.currency || "EGP",
      paid: totalPaid,
      remaining: member.compensation - totalPaid,
      paymentCount: payments.length,
      payments, // Include all payment details
    };
  });

  return {
    projectId,
    projectName: project.name,
    projectCurrency: project.currency || "EGP",
    breakdown,
    summary: {
      employeesCount: breakdown.length,
      totalCompensation: breakdown.reduce((sum, b) => sum + b.compensation, 0),
      totalPaid: breakdown.reduce((sum, b) => sum + b.paid, 0),
      totalRemaining: breakdown.reduce((sum, b) => sum + b.remaining, 0),
    },
  };
}

// ================== CLIENT PAYMENT HISTORY ==================

export async function getClientPaymentHistoryService(projectId) {
  const project = await ProjectModel.findById(projectId)
    .populate("client", "name companyName")
    .lean();

  if (!project) {
    throw new ApiError("Project not found", 404);
  }

  const payments = await TransactionModel.find({
    project: projectId,
    type: TRANSACTION_TYPE.INCOME,
    category: TRANSACTION_CATEGORY.CLIENT_PAYMENT,
  })
    .sort({ date: -1 })
    .populate("addedBy", "name")
    .lean();

  // Format payments with original currency
  const formattedPayments = payments.map((p) => ({
    id: p._id,
    amount: p.amount,
    currency: p.currency || "EGP", // Show original currency
    date: p.date,
    description: p.description,
    paymentMethod: p.paymentMethod,
    reference: p.reference,
    status: p.status,
    addedBy: p.addedBy?.name,
  }));

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    project: {
      _id: project._id,
      name: project.name,
      budget: project.budget,
      currency: project.currency || "EGP", // Show project's original currency
      client: project.client,
    },
    payments: formattedPayments,
    summary: {
      totalPayments: payments.length,
      totalCollected,
      balanceDue: project.budget - totalCollected,
      percentagePaid:
        project.budget > 0
          ? Math.round((totalCollected / project.budget) * 100)
          : 0,
    },
  };
}
