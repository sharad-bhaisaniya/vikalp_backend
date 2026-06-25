import mongoose from "mongoose";

const advertisementSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    runner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    customer_name: {
      type: String,
      required: true,
    },
    ad_title: {
      type: String,
      required: true,
    },
    media_url: {
      type: String,
      required: true,
    },
    total_seconds_purchased: {
      type: Number,
      required: true,
      min: 0,
    },
    purchased_time_value: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    purchased_time_unit: {
      type: String,
      enum: ["seconds", "minutes", "hours"],
      required: true,
      default: "seconds",
    },
    scheduled_dates: {
      type: [String], // Array of 'YYYY-MM-DD'
      required: true,
      default: [],
    },
    total_cost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // Slot-based tracking: 1 slot per runner per day
    slots_per_day: {
      type: Number,
      required: true,
      default: 1,
    },
    // Legacy seconds field (kept for backward compat)
    seconds_per_day: {
      type: Number,
      default: 0,
    },
    daily_consumption: {
      type: Map,
      of: Number, // Key: 'YYYY-MM-DD', Value: slots played
      default: {},
    },
    last_played_at: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "paused", "expired"],
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for efficient queue rotation based on status and last_played_at
advertisementSchema.index({ status: 1, last_played_at: 1 });

const Advertisement = mongoose.model("Advertisement", advertisementSchema);
export default Advertisement;
