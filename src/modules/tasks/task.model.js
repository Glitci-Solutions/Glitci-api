import mongoose from "mongoose";
import { TASK_STATUS } from "../../shared/constants/task.enums.js";

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const taskSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Task name is required"],
      trim: true,
      minlength: [2, "Task name must be at least 2 characters"],
      maxlength: [200, "Task name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      default: null,
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },
    links: [
      {
        name: {
          type: String,
          required: [true, "Link name is required"],
          trim: true,
        },
        url: {
          type: String,
          required: [true, "Link URL is required"],
          trim: true,
        },
        _id: false,
      },
    ],
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.PENDING,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Assigned employee is required"],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    history: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Indexes
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ startTime: -1 });
taskSchema.index({ endTime: -1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });

export const TaskModel =
  mongoose.models.Task || mongoose.model("Task", taskSchema);
