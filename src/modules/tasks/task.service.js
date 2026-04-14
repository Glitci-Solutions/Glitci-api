// src/modules/tasks/task.service.js
import { TaskModel } from "./task.model.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { ProjectModel } from "../projects/project.model.js";
import { UserModel } from "../users/user.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { buildPagination } from "../../shared/utils/apiFeatures.js";
import sendEmail from "../../shared/Email/sendEmails.js";
import { taskCompletedEmailHTML } from "../../shared/Email/emailHtml.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";
import {
  TASK_STATUS,
  TASK_STATUS_ORDER,
  EMPLOYEE_STATUS_FLOW,
} from "../../shared/constants/task.enums.js";

// ─── Helpers ───────────────────────────────────────────────

const ADMIN_ROLES = [USER_ROLES.ADMIN, USER_ROLES.OPERATION];

/**
 * Which roles should receive email when a task is completed by an employee.
 * Change this array to control who gets notified:
 *   - [USER_ROLES.ADMIN]                         → admin only
 *   - [USER_ROLES.OPERATION]                      → operation only
 *   - [USER_ROLES.ADMIN, USER_ROLES.OPERATION]    → both (default)
 */
const TASK_COMPLETED_NOTIFY_ROLES = [USER_ROLES.ADMIN, USER_ROLES.OPERATION];

/** Format a Date to a readable string for emails. */
function formatDateTime(date) {
  return new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  });
}

function isAdminOrOp(user) {
  return ADMIN_ROLES.includes(user.role);
}

/** Returns today's date as YYYY-MM-DD (UTC). */
function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Resolve the Employee document for the currently authenticated user.
 * Throws 404 if no employee profile is linked.
 */
async function resolveEmployeeId(userId) {
  const employee = await EmployeeModel.findOne({ user: userId }).select("_id");
  if (!employee) {
    throw new ApiError("Employee profile not found for this user", 404);
  }
  return employee._id;
}

/**
 * Build a standardised task response object.
 */
function buildTaskResponse(task) {
  const assignedTo = task.assignedTo || {};
  const assignedUser = assignedTo.user || {};
  const project = task.project || null;
  const createdBy = task.createdBy || {};

  return {
    id: task._id,
    name: task.name,
    description: task.description,
    startTime: task.startTime,
    endTime: task.endTime,
    link: task.link,
    status: task.status,
    assignedTo: {
      id: assignedTo._id || assignedTo,
      user: {
        id: assignedUser._id || assignedUser,
        name: assignedUser.name || null,
      },
      department: assignedTo.department
        ? {
            id: assignedTo.department._id || assignedTo.department,
            name: assignedTo.department.name || null,
          }
        : null,
    },
    project: project
      ? {
          id: project._id || project,
          name: project.name || null,
        }
      : null,
    createdBy: {
      id: createdBy._id || createdBy,
      name: createdBy.name || null,
    },
    history: (task.history || []).map((h) => ({
      status: h.status,
      changedAt: h.changedAt,
      changedBy: h.changedBy?._id || h.changedBy,
      changedByName: `${h.changedBy?.role}: ${h.changedBy?.name}` || null,
      description: h.description,
    })),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

/** Populate options reused across queries */
const populateOptions = [
  {
    path: "assignedTo",
    select: "_id user department",
    populate: [
      { path: "user", select: "name" },
      { path: "department", select: "name" },
    ],
  },
  { path: "project", select: "name" },
  { path: "createdBy", select: "name" },
  { path: "history.changedBy", select: "name role" },
];

/**
 * Send "task completed" email to users whose role is in TASK_COMPLETED_NOTIFY_ROLES.
 * Called fire-and-forget — failures are logged, never thrown.
 */
async function notifyTaskCompleted(task) {
  const assignedTo = task.assignedTo || {};
  const assignedUser = assignedTo.user || {};
  const department = assignedTo.department || {};
  const project = task.project || null;

  const recipients = await UserModel.find({
    role: { $in: TASK_COMPLETED_NOTIFY_ROLES },
    isActive: true,
  }).select("name email");

  if (recipients.length === 0) return;

  const emailData = {
    employeeName: assignedUser.name || "Unknown",
    departmentName: department.name || "N/A",
    taskName: task.name,
    projectName: project?.name || null,
    startTime: formatDateTime(task.startTime),
    endTime: formatDateTime(task.endTime),
    completedAt: formatDateTime(new Date()),
  };

  const emailPromises = recipients.map((recipient) => {
    const firstName = (recipient.name || "").split(" ")[0] || "there";
    const capitalizedName =
      firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

    return sendEmail({
      email: recipient.email,
      subject: `Task Completed: ${task.name}`,
      message: taskCompletedEmailHTML({
        ...emailData,
        recipientName: capitalizedName,
      }),
    });
  });

  await Promise.allSettled(emailPromises);
}

// ─── Create Tasks (bulk) ───────────────────────────────────

export async function createTasksService(tasks, creatorUserId) {
  // 1. Collect unique employee & project IDs for batch validation
  const employeeIds = [...new Set(tasks.map((t) => t.assignedTo))];
  const projectIds = [...new Set(tasks.map((t) => t.project).filter(Boolean))];

  // 2. Validate employees exist
  const existingEmployees = await EmployeeModel.find({
    _id: { $in: employeeIds },
  }).select("_id");
  const existingEmployeeSet = new Set(
    existingEmployees.map((e) => e._id.toString()),
  );

  for (const id of employeeIds) {
    if (!existingEmployeeSet.has(id.toString())) {
      throw new ApiError(`Employee not found: ${id}`, 400);
    }
  }

  // 3. Validate projects exist (only the ones provided)
  if (projectIds.length > 0) {
    const existingProjects = await ProjectModel.find({
      _id: { $in: projectIds },
    }).select("_id");
    const existingProjectSet = new Set(
      existingProjects.map((p) => p._id.toString()),
    );

    for (const id of projectIds) {
      if (!existingProjectSet.has(id.toString())) {
        throw new ApiError(`Project not found: ${id}`, 400);
      }
    }
  }

  // 4. Build task documents
  const taskDocs = tasks.map((t) => ({
    name: t.name,
    description: t.description || null,
    startTime: t.startTime,
    endTime: t.endTime,
    link: t.link || null,
    status: TASK_STATUS.PENDING,
    assignedTo: t.assignedTo,
    project: t.project || null,
    createdBy: creatorUserId,
    history: [
      {
        status: TASK_STATUS.PENDING,
        changedBy: creatorUserId,
        changedAt: new Date(),
        description: "Task created",
      },
    ],
  }));

  // 5. Bulk insert
  const created = await TaskModel.insertMany(taskDocs);

  return {
    count: created.length,
    ids: created.map((t) => t._id),
  };
}

// ─── Get Tasks (list) ──────────────────────────────────────

export async function getTasksService(queryParams, currentUser) {
  const { page, limit, employee, department, status, project, date, ...rest } =
    queryParams;

  const filter = {};

  // Role-based filtering
  if (!isAdminOrOp(currentUser)) {
    // Employee: only their own, exclude completed
    const employeeId = await resolveEmployeeId(currentUser._id);
    filter.assignedTo = employeeId;
    filter.status = { $ne: TASK_STATUS.COMPLETED };
  } else {
    // Admin/Op: optional filters
    if (employee) {
      filter.assignedTo = employee;
    } else if (department) {
      // Resolve all employees in the given department
      const employeesInDept = await EmployeeModel.find({
        department,
      }).select("_id");
      filter.assignedTo = { $in: employeesInDept.map((e) => e._id) };
    }
    if (status) filter.status = status;
    if (project) filter.project = project;
  }

  // Shared: overlap check — task is "active" on the given date
  // A task is active if startTime <= endOfDay AND endTime >= startOfDay
  const effectiveDate = date || getTodayDateString();
  const dayStart = new Date(`${effectiveDate}T00:00:00.000Z`);
  const dayEnd = new Date(`${effectiveDate}T23:59:59.999Z`);

  filter.startTime = { $lte: dayEnd };
  filter.endTime = { $gte: dayStart };

  const totalCount = await TaskModel.countDocuments(filter);
  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 10);
  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  // Sort by earliest deadline first
  const tasks = await TaskModel.find(filter)
    .populate(populateOptions)
    .sort({ endTime: 1 })
    .skip(skip)
    .limit(limitNum);

  return {
    totalPages,
    page: pageNum,
    limit: limitNum,
    results: tasks.length,
    data: tasks.map(buildTaskResponse),
  };
}

// ─── Update Task Status ────────────────────────────────────

export async function updateTaskStatusService(taskId, newStatus, currentUser) {
  const task = await TaskModel.findById(taskId).populate({
    path: "assignedTo",
    select: "user",
  });

  if (!task) {
    throw new ApiError("Task not found", 404);
  }

  const currentStatus = task.status;

  // Prevent no-op
  if (currentStatus === newStatus) {
    throw new ApiError(`Task is already "${newStatus}"`, 400);
  }

  const currentIndex = TASK_STATUS_ORDER.indexOf(currentStatus);
  const newIndex = TASK_STATUS_ORDER.indexOf(newStatus);

  // Never allow backward transitions for anyone
  if (newIndex <= currentIndex) {
    throw new ApiError(
      `Cannot transition from "${currentStatus}" to "${newStatus}". Only forward transitions are allowed`,
      400,
    );
  }

  if (isAdminOrOp(currentUser)) {
    // Admin/Op: any forward jump is allowed (including "postponed")
    // — already validated above (newIndex > currentIndex)
  } else {
    // Employee: strict sequential, no "postponed"
    // 1. Verify ownership
    const employeeId = await resolveEmployeeId(currentUser._id);
    if (task.assignedTo._id.toString() !== employeeId.toString()) {
      throw new ApiError("You are not authorized to update this task", 403);
    }

    // 2. Cannot set "postponed"
    if (newStatus === TASK_STATUS.POSTPONED) {
      throw new ApiError(
        "Only admin or operation users can postpone tasks",
        403,
      );
    }

    // 3. Must be the next step in the employee flow
    const employeeCurrentIndex = EMPLOYEE_STATUS_FLOW.indexOf(currentStatus);
    const employeeNewIndex = EMPLOYEE_STATUS_FLOW.indexOf(newStatus);

    if (
      employeeCurrentIndex === -1 ||
      employeeNewIndex === -1 ||
      employeeNewIndex !== employeeCurrentIndex + 1
    ) {
      throw new ApiError(
        `Employees can only transition to the next status. Expected "${EMPLOYEE_STATUS_FLOW[employeeCurrentIndex + 1]}"`,
        400,
      );
    }
  }

  // Apply update
  task.status = newStatus;
  task.history.push({
    status: newStatus,
    changedBy: currentUser._id,
    changedAt: new Date(),
    description: `Status changed to ${newStatus}`,
  });

  await task.save();

  // Return fresh populated task
  const updated = await TaskModel.findById(taskId).populate(populateOptions);

  // Send email notification when an employee completes a task (fire-and-forget)
  if (newStatus === TASK_STATUS.COMPLETED && !isAdminOrOp(currentUser)) {
    notifyTaskCompleted(updated).catch((err) =>
      console.error("Failed to send task-completed email:", err.message),
    );
  }

  return buildTaskResponse(updated);
}

// ─── Analytics ─────────────────────────────────────────────

export async function getTaskAnalyticsService(queryParams) {
  const { employee, project, startDate, endDate } = queryParams;

  const matchStage = {};

  if (employee) matchStage.assignedTo = employee;
  if (project) matchStage.project = project;

  const effectiveStartDate = startDate || getTodayDateString();
  const effectiveEndDate = endDate || getTodayDateString();

  matchStage.startTime = {
    $gte: new Date(`${effectiveStartDate}T00:00:00.000Z`),
    $lte: new Date(`${effectiveEndDate}T23:59:59.999Z`),
  };

  // Convert string IDs to ObjectId for aggregation
  if (matchStage.assignedTo) {
    const mongoose = (await import("mongoose")).default;
    matchStage.assignedTo = new mongoose.Types.ObjectId(matchStage.assignedTo);
  }
  if (matchStage.project) {
    const mongoose = (await import("mongoose")).default;
    matchStage.project = new mongoose.Types.ObjectId(matchStage.project);
  }

  const [summary] = await TaskModel.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.COMPLETED] }, 1, 0] },
        },
        pending: {
          $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.PENDING] }, 1, 0] },
        },
        inProgress: {
          $sum: {
            $cond: [{ $eq: ["$status", TASK_STATUS.IN_PROGRESS] }, 1, 0],
          },
        },
        postponed: {
          $sum: {
            $cond: [{ $eq: ["$status", TASK_STATUS.POSTPONED] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalTasks: 1,
        completed: 1,
        pending: 1,
        inProgress: 1,
        postponed: 1,
        completionRate: {
          $cond: [
            { $gt: ["$totalTasks", 0] },
            {
              $round: [
                {
                  $multiply: [{ $divide: ["$completed", "$totalTasks"] }, 100],
                },
                2,
              ],
            },
            0,
          ],
        },
      },
    },
  ]);

  // Fetch tasks matching the filter (paginated list alongside summary)
  const tasks = await TaskModel.find(matchStage)
    .populate(populateOptions)
    .sort({ startTime: -1 });

  return {
    ...(summary || {
      totalTasks: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      postponed: 0,
      completionRate: 0,
    }),
    tasks: tasks.map(buildTaskResponse),
  };
}
