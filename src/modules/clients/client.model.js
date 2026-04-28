import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phones: [
      {
        type: String,
        trim: true,
      },
    ],
    industry: String,
    notes: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Indexes for query performance
clientSchema.index({ email: 1 });
clientSchema.index({ isActive: 1 });
clientSchema.index({ name: 1 });

export const ClientModel =
  mongoose.models.Client || mongoose.model("Client", clientSchema);
