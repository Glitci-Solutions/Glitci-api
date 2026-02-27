import mongoose from "mongoose";
import { ProjectModel } from "../projects/project.model.js";
import { ProjectMemberModel } from "../projects/projectMember.model.js";
import { TransactionModel } from "../transactions/transaction.model.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { DepartmentModel } from "../departments/department.model.js";
import {
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
} from "../../shared/constants/transaction.enums.js";
import { DEFAULT_CURRENCY } from "../../shared/constants/currency.enums.js";

const { ObjectId } = mongoose.Types;

/**
 * Get default date range (start of month to end of today) in UTC
 */
function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  return { from, to };
}

/**
 * Parse date range from query string:
 * - If both 'from' and 'to' are missing -> Lifetime mode.
 * - If dates are provided -> Filtered mode.
 */
function parseDateRange(query) {
  // If no dates provided, use lifetime mode
  if (!query.from && !query.to) {
    return { from: null, to: null, isLifetime: true };
  }

  const defaults = getDefaultDateRange();

  // Parsing from query string (ISO format like "2026-02-01")
  const from = query.from ? new Date(query.from) : defaults.from;
  const to = query.to ? new Date(query.to) : defaults.to;

  // Ensure 'to' date covers the full day in UTC
  to.setUTCHours(23, 59, 59, 999);

  return { from, to, isLifetime: false };
}

// ================== OVERVIEW (TIME-BASED DATA) ==================

export async function getOverviewService(
  query = {},
  userCurrency = DEFAULT_CURRENCY,
) {
  const { from, to, isLifetime } = parseDateRange(query);

  // Build the amount field path based on user currency
  const amountField = `$amountConverted.${userCurrency}`;
  const budgetField = `$budgetConverted.${userCurrency}`;

  const dateFilter = isLifetime ? {} : { date: { $gte: from, $lte: to } };

  const [
    transactionSummary,
    incomeByDepartment,
    monthlyGrowth,
    recentProjects,
  ] = await Promise.all([
    // Financial summary for the period (using converted amounts)
    // Group by type, category, and hasEmployee to separate salaries from other expenses
    TransactionModel.aggregate([
      {
        $match: {
          ...dateFilter,
          status: TRANSACTION_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: {
            type: "$type",
            category: "$category",
            hasEmployee: {
              $cond: [{ $ifNull: ["$employee", false] }, true, false],
            },
          },
          total: {
            $sum: {
              $cond: [
                { $gt: [amountField, 0] },
                { $round: [amountField, 0] },
                { $round: ["$amount", 0] },
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),

    // Income by department (via project department)
    TransactionModel.aggregate([
      {
        $match: {
          ...dateFilter,
          type: TRANSACTION_TYPE.INCOME,
          status: TRANSACTION_STATUS.COMPLETED,
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "projectData",
        },
      },
      { $unwind: { path: "$projectData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "departments",
          localField: "projectData.department",
          foreignField: "_id",
          as: "departmentData",
        },
      },
      {
        $unwind: { path: "$departmentData", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: {
            department: "$departmentData.name",
            quarter: { $ceil: { $divide: [{ $month: "$date" }, 3] } },
          },
          total: {
            $sum: {
              $cond: [
                { $gt: [amountField, 0] },
                { $round: [amountField, 0] },
                { $round: ["$amount", 0] },
              ],
            },
          },
        },
      },
      { $sort: { "_id.quarter": 1, "_id.department": 1 } },
    ]),

    // Monthly growth (for chart)
    TransactionModel.aggregate([
      {
        $match: {
          type: TRANSACTION_TYPE.INCOME,
          status: TRANSACTION_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          total: {
            $sum: {
              $cond: [
                { $gt: [amountField, 0] },
                { $round: [amountField, 0] },
                { $round: ["$amount", 0] },
              ],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // Recent projects
    ProjectModel.find({ isActive: true })
      .select("name status startDate endDate budget currency budgetConverted")
      .populate("client", "name companyName")
      .populate("department", "name")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  // Parse transaction totals by type and category
  let totalIncome = 0;
  let totalSalaries = 0;
  let otherExpenses = 0;

  transactionSummary.forEach((entry) => {
    const { type, category, hasEmployee } = entry._id;

    if (type === TRANSACTION_TYPE.INCOME) {
      totalIncome += entry.total;
    } else if (type === TRANSACTION_TYPE.EXPENSE) {
      // Count as salary if:
      // 1. Category is employee_salary or employee_bonus, OR
      // 2. Has an employee linked (safety net for mis-categorized payments)
      const isSalary =
        category === TRANSACTION_CATEGORY.EMPLOYEE_SALARY ||
        category === TRANSACTION_CATEGORY.EMPLOYEE_BONUS ||
        category === TRANSACTION_CATEGORY.EMPLOYEE_PAYMENT ||
        hasEmployee;

      if (isSalary) {
        totalSalaries += entry.total;
      } else {
        otherExpenses += entry.total;
      }
    }
  });

  const totalExpenses = totalSalaries + otherExpenses;
  const netProfit = totalIncome - totalExpenses;
  const profitMargin =
    totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  // Format income by department for chart
  const quarterlyByDept = {};
  incomeByDepartment.forEach((item) => {
    const deptName = item._id.department || "Unassigned";
    const quarter = `Q${item._id.quarter}`;
    if (!quarterlyByDept[quarter]) quarterlyByDept[quarter] = { quarter };
    quarterlyByDept[quarter][deptName] = item.total;
  });

  // Format growth data for chart
  const growthTrend = monthlyGrowth.map((item) => ({
    year: item._id.year,
    month: item._id.month,
    value: item.total,
  }));

  // Format recent projects (with budget in user's currency)
  const formattedProjects = recentProjects.map((p) => ({
    id: p._id,
    name: p.name,
    client: p.client?.name || p.client?.companyName || null,
    department: p.department?.name || null,
    status: p.status,
    startDate: p.startDate,
    endDate: p.endDate,
    budget: Math.round(p.budgetConverted?.[userCurrency] || p.budget),
  }));

  return {
    period: isLifetime ? { lifetime: true } : { from, to },
    currency: userCurrency,
    financials: {
      totalIncome: Math.round(totalIncome),
      totalSalaries: Math.round(totalSalaries),
      otherExpenses: Math.round(otherExpenses),
      netProfit: Math.round(netProfit),
      profitMargin,
    },
    charts: {
      growthTrend,
      incomeByDepartment: Object.values(quarterlyByDept),
    },
    recentProjects: formattedProjects,
  };
}

// ================== STATS (STATIC COUNTS - NO TIME FILTER) ==================

export async function getStatsService(userCurrency = DEFAULT_CURRENCY) {
  // Build the amount field path based on user currency
  const amountField = `$amountConverted.${userCurrency}`;
  const budgetField = `$budgetConverted.${userCurrency}`;

  const [
    activeProjects,
    totalProjects,
    activeEmployees,
    departmentStats,
    avgCompletion,
  ] = await Promise.all([
    ProjectModel.countDocuments({ isActive: true }),
    ProjectModel.countDocuments({}),

    // Active employees (users with isActive = true)
    EmployeeModel.countDocuments({}).then(async () => {
      const employees = await EmployeeModel.find({})
        .populate("user", "isActive")
        .lean();
      return employees.filter((e) => e.user?.isActive).length;
    }),

    // Department expenses (all-time)
    TransactionModel.aggregate([
      {
        $match: {
          type: TRANSACTION_TYPE.EXPENSE,
          status: TRANSACTION_STATUS.COMPLETED,
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "projectData",
        },
      },
      { $unwind: { path: "$projectData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "departments",
          localField: "projectData.department",
          foreignField: "_id",
          as: "departmentData",
        },
      },
      {
        $unwind: { path: "$departmentData", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: "$departmentData._id",
          name: { $first: "$departmentData.name" },
          spent: {
            $sum: {
              // Use converted amount if > 0, otherwise fall back to raw amount
              $cond: [
                { $gt: [amountField, 0] },
                { $round: [amountField, 0] },
                { $round: ["$amount", 0] },
              ],
            },
          },
        },
      },
    ]),

    // Average completion (based on project status)
    ProjectModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const departmentBudgets = {};

  // Estimate budget as sum of project budgets per department
  const projectsByDept = await ProjectModel.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$department",
        totalBudget: {
          $sum: {
            // Use converted budget if > 0, otherwise fall back to raw budget
            $cond: [
              { $gt: [budgetField, 0] },
              { $round: [budgetField, 0] },
              { $round: ["$budget", 0] },
            ],
          },
        },
      },
    },
  ]);

  projectsByDept.forEach((p) => {
    if (p._id) departmentBudgets[p._id.toString()] = p.totalBudget;
  });

  // Format department progress
  const departmentProgress = departmentStats
    .filter((d) => d._id)
    .map((d) => {
      const budget = Math.round(departmentBudgets[d._id.toString()] || 0);
      const spent = Math.round(d.spent);
      return {
        id: d._id,
        name: d.name || "Unknown",
        spent,
        budget,
        percent: budget > 0 ? Math.round((spent / budget) * 100) : 0,
      };
    });

  // Calculate average completion percentage
  const completionData = avgCompletion[0];
  const avgCompletionPercent =
    completionData?.total > 0
      ? Math.round((completionData.completed / completionData.total) * 100)
      : 0;

  return {
    currency: userCurrency,
    counts: {
      totalProjects,
      activeProjects,
      activeEmployees,
      avgCompletion: avgCompletionPercent,
    },
    departments: departmentProgress,
  };
}
