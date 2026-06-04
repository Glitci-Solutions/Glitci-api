import mongoose from "mongoose";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_SOURCE,
} from "../../shared/constants/attendance.enums.js";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    checkIn: {
      time: Date,
      location: {
        lat: Number,
        lng: Number,
        accuracy: Number,
      },
      source: {
        type: String,
        enum: Object.values(ATTENDANCE_SOURCE),
        default: ATTENDANCE_SOURCE.QR_SCAN,
      },
    },
    checkOut: {
      time: Date,
      location: {
        lat: Number,
        lng: Number,
        accuracy: Number,
      },
      source: {
        type: String,
        enum: Object.values(ATTENDANCE_SOURCE),
      },
    },
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      required: [true, "Status is required"],
    },
    durationMinutes: Number,
    note: String,
    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ employee: 1, date: -1 });

export const Attendance =
  mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);