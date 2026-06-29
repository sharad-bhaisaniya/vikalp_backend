import mongoose from "mongoose";

const adSlotSchema = new mongoose.Schema({
  screen_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Screen",
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "booked", "played"],
    default: "available",
  },
  advertisement_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Advertisement",
    default: null, // Null means available
  },
  start_time: {
    type: Date,
    required: true,
    index: true, // Indexed for fast timeline queries
  },
  end_time: {
    type: Date,
    required: true,
  },
  slot_duration_seconds: {
    type: Number,
    required: true,
  },
  date: {
    type: String, // e.g., "2026-06-29" for easy daily aggregation
    required: true,
  }
}, { timestamps: true });

const AdSlot = mongoose.model("AdSlot", adSlotSchema);
export default AdSlot;
