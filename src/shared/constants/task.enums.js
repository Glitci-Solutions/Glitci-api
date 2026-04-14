export const TASK_STATUS = Object.freeze({
  PENDING: "pending",
  IN_PROGRESS: "in progress",
  POSTPONED: "postponed",
  COMPLETED: "completed",
});

// Ordered list — used to enforce forward-only transitions
export const TASK_STATUS_ORDER = [
  TASK_STATUS.PENDING,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.POSTPONED,
  TASK_STATUS.COMPLETED,
];

// Employee can only transition through this subset (no "postponed")
export const EMPLOYEE_STATUS_FLOW = [
  TASK_STATUS.PENDING,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.COMPLETED,
];
