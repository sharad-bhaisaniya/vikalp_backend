import mongoose from "mongoose";

const globalSettingsSchema = new mongoose.Schema(
  {
    total_operating_seconds: {
      type: Number,
      required: true,
      default: 360, // 6 minutes in seconds (Loop Duration)
    },
    current_slot_duration_seconds: {
      type: Number,
      required: true,
      default: 12, // default 12 seconds
    },
    price_per_second: {
      type: mongoose.Schema.Types.Decimal128, // Updated to Decimal128 for precise currency
      required: true,
      default: 1.5, // ₹1.50 per second default
      min: 0,
      // Automatically converts Decimal128 to a JS number when converted to JSON
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

const GlobalSettings = mongoose.model("GlobalSettings", globalSettingsSchema);
export default GlobalSettings;
