export const ATTENDANCE_STATUS = Object.freeze({
  PRESENT:  "present",
  LATE:     "late",
  ABSENT:   "absent",
  LEAVE:    "leave",
  HALF_DAY: "half_day",
  HOLIDAY:  "holiday",
});

export const LEAVE_TYPE = Object.freeze({
  SICK:     "sick",
  VACATION: "vacation",
  PERSONAL: "personal",
  UNPAID:   "unpaid",
});

export const ATTENDANCE_SOURCE = Object.freeze({
  QR_SCAN:       "qr_scan",
  MANUAL:        "manual",
  AUTO_CHECKOUT: "auto_checkout",
  AUTO_ABSENT:   "auto_absent",
});

export const LEAVE_STATUS = Object.freeze({
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});