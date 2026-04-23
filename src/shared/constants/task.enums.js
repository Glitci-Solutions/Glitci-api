export const TASK_STATUS = Object.freeze({
  PENDING: "pending",
  IN_PROGRESS: "in progress",
  IN_REVIEW: "in review",
  POSTPONED: "postponed",
  COMPLETED: "completed",
});

// Ordered list — used for reference
export const TASK_STATUS_ORDER = [
  TASK_STATUS.PENDING,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.IN_REVIEW,
  TASK_STATUS.POSTPONED,
  TASK_STATUS.COMPLETED,
];

// Employee can only transition through this subset (no "postponed", no "completed")
export const EMPLOYEE_STATUS_FLOW = [
  TASK_STATUS.PENDING,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.IN_REVIEW,
];
