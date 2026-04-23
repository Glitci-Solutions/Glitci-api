import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Link name is required"],
      trim: true,
      minlength: [2, "Link name must be at least 2 characters"],
      maxlength: [200, "Link name cannot exceed 200 characters"],
    },
    url: {
      type: String,
      required: [true, "Link URL is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      default: null,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
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
  },
  { timestamps: true },
);

// Indexes
assetSchema.index({ client: 1 });
assetSchema.index({ project: 1 });
assetSchema.index({ createdBy: 1 });

export const AssetModel =
  mongoose.models.Asset || mongoose.model("Asset", assetSchema);
