import mongoose from "mongoose";

const screenLogSchema = new mongoose.Schema(
  {
    screenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Screen",
      required: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Advertisement",
      required: true,
      index: true,
    },
    actual_duration_seconds: {
      type: Number,
      required: true,
      min: 1,
    },
    consumedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["processed", "failed", "pending"],
      default: "pending",
    },
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const ScreenLog = mongoose.model("ScreenLog", screenLogSchema);
export default ScreenLog;
