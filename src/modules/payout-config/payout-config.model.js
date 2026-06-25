import mongoose from "mongoose";

const payoutConfigSchema = new mongoose.Schema(
  {
    configName: {
      type: String,
      required: true,
      trim: true,
    },
    distributionType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
      default: "percentage",
    },
    splits: {
      adminShare: { type: Number, required: true, min: 0 },
      cityAdminShare: { type: Number, required: true, min: 0 },
      adGetterShare: { type: Number, required: true, min: 0 },
      runnerShare: { type: Number, required: true, min: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const PayoutConfig = mongoose.model("PayoutConfig", payoutConfigSchema);
export default PayoutConfig;
