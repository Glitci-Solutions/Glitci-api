import mongoose from "mongoose";

const qrTokenSchema = new mongoose.Schema(
  {
    token:  { type: String, required: [true, "Token is required"], unique: true },
    usedAt: { type: Date, default: Date.now },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: false }
);

qrTokenSchema.index({ usedAt: 1 }, { expireAfterSeconds: 300 });

export const QRToken =
  mongoose.models.QRToken || mongoose.model("QRToken", qrTokenSchema);