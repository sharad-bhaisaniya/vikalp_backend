import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    cityName: {
      type: String,
      required: [true, "City name is required"],
      trim: true,
      maxlength: [100, "City name cannot exceed 100 characters"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      maxlength: [100, "State name cannot exceed 100 characters"],
    },
    /**
     * pincode is intentionally optional.
     * A city may have multiple zones/pincodes or may be searched without one.
     */
    pincode: {
      type: String,
      trim: true,
      match: [/^\d{6}$/, "Pincode must be a valid 6-digit number"],
      default: null,
    },
    /**
     * isActive allows soft-disabling of a location without deletion.
     */
    isActive: {
      type: Boolean,
      default: true,
    },
    /**
     * createdBy: Tracks which admin added this location.
     */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes for fast search ─────────────────────────────────────────────────
locationSchema.index({ cityName: "text", state: "text" }); // Full-text search
locationSchema.index({ pincode: 1 });
locationSchema.index({ cityName: 1, state: 1 });

const Location = mongoose.model("Location", locationSchema);
export default Location;
