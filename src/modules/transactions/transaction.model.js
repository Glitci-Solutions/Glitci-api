import mongoose from "mongoose";
import {
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  PAYMENT_METHOD,
} from "../../shared/constants/transaction.enums.js";
import {
  CURRENCY_VALUES,
  DEFAULT_CURRENCY,
} from "../../shared/constants/currency.enums.js";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPE),
      required: [true, "Transaction type is required"],
    },
    category: {
      type: String,
      enum: Object.values(TRANSACTION_CATEGORY),
      required: [true, "Category is required"],
    },
    // Flexible references - all optional for different use cases
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      enum: CURRENCY_VALUES,
      required: [true, "Currency is required"],
      default: DEFAULT_CURRENCY,
    },
    amountConverted: {
      EGP: { type: Number, default: null },
      SAR: { type: Number, default: null },
      AED: { type: Number, default: null },
      USD: { type: Number, default: null },
      EUR: { type: Number, default: null },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.INSTAPAY,
    },
    reference: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUS),
      default: TRANSACTION_STATUS.COMPLETED,
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "AddedBy is required"],
    },
  },
  { timestamps: true },
);

// Indexes for common queries
transactionSchema.index({ project: 1, date: -1 });
transactionSchema.index({ client: 1, date: -1 });
transactionSchema.index({ employee: 1, date: -1 });
transactionSchema.index({ type: 1, date: -1 });
transactionSchema.index({ category: 1, date: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ addedBy: 1 });

export const TransactionModel =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);
