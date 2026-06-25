import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["campaign_hold", "ad_play_deduction", "payout", "deposit", "withdrawal"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    metadata: {
      screenId: { type: mongoose.Schema.Types.ObjectId, ref: "Screen" },
      campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Advertisement" },
      actual_duration_seconds: { type: Number },
      payout_split: { type: Object },
      notes: { type: String },
    },
  },
  { timestamps: true }
);

const WalletHistory = mongoose.model("WalletHistory", historySchema);
export default WalletHistory;
