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

// ================== HELPER: format grouped-by-currency arrays ==================

function formatByCurrency(aggResult) {
  return aggResult
    .map((item) => ({
      currency: item._id,
      amount: item.total,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * Subtract two by-currency arrays: (a - b) per currency.
 * If a currency exists in `b` but not `a`, it appears as negative.
 */
function subtractByCurrency(a, b) {
  const map = {};
  a.forEach((item) => {
    map[item.currency] = (map[item.currency] || 0) + item.amount;
  });
  b.forEach((item) => {
    map[item.currency] = (map[item.currency] || 0) - item.amount;
  });
  return Object.entries(map)
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

// ================== PROJECT FINANCIALS ==================

export async function getProjectFinancialsService(projectId) {
  const project = await ProjectModel.findById(projectId)
    .populate("client", "name companyName")
    .lean();

  if (!project) {
    throw new ApiError("Project not found", 404);
  }

  const [memberAgg, transactionAgg, employeePayments] = await Promise.all([
    // Total compensation grouped by currency
    ProjectMemberModel.aggregate([
      {
        $match: {
          project: new ObjectId(projectId),
          removedAt: null,
        },
      },
      {
        $group: {
          _id: "$currency",
          total: { $sum: "$compensation" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Sum transactions by type AND currency
    TransactionModel.aggregate([
      {
        $match: {
          project: new ObjectId(projectId),
          status: TRANSACTION_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: { type: "$type", currency: "$currency" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Employee-specific payments grouped by currency
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
          _id: "$currency",
          total: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  // Employees count (sum across all currency groups)
  const employeesCount = memberAgg.reduce((sum, g) => sum + g.count, 0);

  // Compensation grouped by currency
  const totalEmployeesCompensation = formatByCurrency(memberAgg);

  // Income grouped by currency
  const incomeEntries = transactionAgg.filter(
    (t) => t._id.type === TRANSACTION_TYPE.INCOME,
  );
  const moneyCollected = formatByCurrency(
    incomeEntries.map((e) => ({ _id: e._id.currency, total: e.total })),
  );

  // Expenses grouped by currency
  const expenseEntries = transactionAgg.filter(
    (t) => t._id.type === TRANSACTION_TYPE.EXPENSE,
  );
  const totalExpenses = formatByCurrency(
    expenseEntries.map((e) => ({ _id: e._id.currency, total: e.total })),
  );

  // Paid to employees grouped by currency
  const paidToEmployees = formatByCurrency(employeePayments);

  // Other expenses = total expenses - paid to employees (per currency)
  const otherExpenses = subtractByCurrency(totalExpenses, paidToEmployees);

  // Client balance due = budget - income collected (per budget currency)
  const budgetCurrency = project.currency || "EGP";
  const collectedInBudgetCurrency =
    moneyCollected.find((m) => m.currency === budgetCurrency)?.amount || 0;
  const clientBalanceDue = [
    {
      currency: budgetCurrency,
      amount: project.budget - collectedInBudgetCurrency,
    },
    ...moneyCollected
      .filter((m) => m.currency !== budgetCurrency)
      .map((m) => ({ currency: m.currency, amount: -m.amount })),
  ].filter((item) => item.amount !== 0);

  // Employee balance due = compensation - paid (per currency)
  const employeeBalanceDue = subtractByCurrency(
    totalEmployeesCompensation,
    paidToEmployees,
  );

  return {
    project: {
      _id: project._id,
      name: project.name,
      budget: project.budget,
      currency: budgetCurrency,
      client: project.client,
      status: project.status,
    },
    financials: {
      budget: project.budget,
      budgetCurrency,
      totalEmployeesCompensation,
      employeesCount,

      // Actual money movement (grouped by currency)
      moneyCollected,
      totalExpenses,
      paidToEmployees,
      otherExpenses,

      // Calculated balances (grouped by currency)
      clientBalanceDue,
      employeeBalanceDue,
    },
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
    const memberCurrency = member.currency || "EGP";

    // Sum payments in the member's own currency only
    const paidInMemberCurrency = payments
      .filter((p) => p.currency === memberCurrency)
      .reduce((sum, p) => sum + p.amount, 0);

    // Payments in other currencies (show separately)
    const paidInOtherCurrencies = payments
      .filter((p) => p.currency !== memberCurrency)
      .reduce((acc, p) => {
        const existing = acc.find((a) => a.currency === p.currency);
        if (existing) existing.amount += p.amount;
        else acc.push({ currency: p.currency, amount: p.amount });
        return acc;
      }, []);

    const paid = [
      { currency: memberCurrency, amount: paidInMemberCurrency },
      ...paidInOtherCurrencies,
    ].filter((p) => p.amount > 0);

    const remaining = member.compensation - paidInMemberCurrency;

    return {
      employee: {
        id: member.employee._id,
        name: member.employee.user?.name || "Unknown",
        email: member.employee.user?.email,
        position: member.employee.position?.name,
      },
      compensation: member.compensation,
      currency: memberCurrency,
      paid,
      remaining,
      paymentCount: payments.length,
      payments,
    };
  });

  // Group summary totals by currency
  const summaryMap = {};
  breakdown.forEach((b) => {
    if (!summaryMap[b.currency]) {
      summaryMap[b.currency] = { compensation: 0, paid: 0, remaining: 0 };
    }
    summaryMap[b.currency].compensation += b.compensation;
    summaryMap[b.currency].remaining += b.remaining;
    // Sum paid in the member's own currency
    const paidInOwn = b.paid.find((p) => p.currency === b.currency);
    summaryMap[b.currency].paid += paidInOwn?.amount || 0;
  });

  const summaryByCurrency = Object.entries(summaryMap)
    .map(([currency, vals]) => ({
      currency,
      totalCompensation: vals.compensation,
      totalPaid: vals.paid,
      totalRemaining: vals.remaining,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  return {
    projectId,
    projectName: project.name,
    projectCurrency: project.currency || "EGP",
    breakdown,
    summary: {
      employeesCount: breakdown.length,
      byCurrency: summaryByCurrency,
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
    currency: p.currency || "EGP",
    date: p.date,
    description: p.description,
    paymentMethod: p.paymentMethod,
    reference: p.reference,
    status: p.status,
    addedBy: p.addedBy?.name,
  }));

  // Group totalCollected by currency
  const collectedMap = {};
  payments.forEach((p) => {
    const cur = p.currency || "EGP";
    collectedMap[cur] = (collectedMap[cur] || 0) + p.amount;
  });
  const totalCollected = Object.entries(collectedMap)
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  const budgetCurrency = project.currency || "EGP";
  const collectedInBudgetCurrency =
    totalCollected.find((c) => c.currency === budgetCurrency)?.amount || 0;

  return {
    project: {
      _id: project._id,
      name: project.name,
      budget: project.budget,
      currency: budgetCurrency,
      client: project.client,
    },
    payments: formattedPayments,
    summary: {
      totalPayments: payments.length,
      totalCollected,
      balanceDue: [
        {
          currency: budgetCurrency,
          amount: project.budget - collectedInBudgetCurrency,
        },
        ...totalCollected
          .filter((c) => c.currency !== budgetCurrency)
          .map((c) => ({ currency: c.currency, amount: -c.amount })),
      ].filter((item) => item.amount !== 0),
      percentagePaid:
        project.budget > 0
          ? Math.round((collectedInBudgetCurrency / project.budget) * 100)
          : 0,
    },
  };
}
