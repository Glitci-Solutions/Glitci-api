import mongoose from "mongoose";
import {
  LEAVE_TYPE,
  LEAVE_STATUS,
} from "../../shared/constants/attendance.enums.js";

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee is required"],
    },
    type: {
      type: String,
      enum: Object.values(LEAVE_TYPE),
      required: [true, "Leave type is required"],
    },
    startDate: { type: Date, required: [true, "Start date is required"] },
    endDate:   { type: Date, required: [true, "End date is required"] },
    reason:    { type: String, required: [true, "Reason is required"] },
    status: {
      type: String,
      enum: Object.values(LEAVE_STATUS),
      default: LEAVE_STATUS.PENDING,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNote: String,
    reviewedAt: Date,
  },
  { timestamps: true }
);

leaveRequestSchema.index({ employee: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

export const LeaveRequest =
  mongoose.models.LeaveRequest ||
  mongoose.model("LeaveRequest", leaveRequestSchema);