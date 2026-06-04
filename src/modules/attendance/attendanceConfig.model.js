import mongoose from "mongoose";
import crypto from "crypto";

const attendanceConfigSchema = new mongoose.Schema(
  {
    companyLocation: {
      lat: { type: Number, required: [true, "Latitude is required"], default: 30.0444 },
      lng: { type: Number, required: [true, "Longitude is required"], default: 31.2357 },
    },
    allowedRadius:    { type: Number, default: 100 },
    workStartTime:    { type: String, default: "09:00" },
    workEndTime:      { type: String, default: "17:00" },
    lateGraceMinutes: { type: Number, default: 15 },
    workDays: {
      type: [Number],
      default: [0, 1, 2, 3, 4],
    },
    qrLifetimeSeconds: { type: Number, default: 60 },
    qrSigningSecret: {
      type: String,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    kioskPinHash: String,
    activeKiosks: [
      {
        deviceId:   String,
        deviceName: String,
        lastSeen:   Date,
        createdAt:  { type: Date, default: Date.now },
      },
    ],
    autoCheckoutTime: { type: String, default: "20:00" },
    autoAbsentTime:   { type: String, default: "20:30" },
    timezone: { type: String, default: "Africa/Cairo" },
    trackFreelancers: { type: Boolean, default: false },
  },
  { timestamps: true }
);

attendanceConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) config = await this.create({});
  return config;
};

export const AttendanceConfig =
  mongoose.models.AttendanceConfig ||
  mongoose.model("AttendanceConfig", attendanceConfigSchema);