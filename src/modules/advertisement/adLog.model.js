import mongoose from "mongoose";

const adLogSchema = new mongoose.Schema(
  {
    advertisement_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Advertisement",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // the advertiser who owns the ad
    },
    runner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // the runner who played the ad
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    played_seconds: {
      type: Number,
      required: true,
    },
    price_per_second: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : v),
    },
    total_cost: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : v),
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Index to quickly find logs by date and runner/user
adLogSchema.index({ date: 1, advertisement_id: 1 });
adLogSchema.index({ runner_id: 1, date: 1 });
adLogSchema.index({ user_id: 1, date: 1 });

const AdLog = mongoose.model("AdLog", adLogSchema);
export default AdLog;
