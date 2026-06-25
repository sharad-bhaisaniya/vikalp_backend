import mongoose from "mongoose";

const screenSchema = new mongoose.Schema(
  {
    screenBannerName: {
      type: String,
      required: [true, "Screen banner name is required"],
      trim: true,
    },
    screenType: {
      type: String,
      enum: {
        values: ["LED", "Smart", "Other"],
        message: "Screen type must be one of: LED, Smart, Other",
      },
      required: [true, "Screen type is required"],
    },
    password: {
      type: String,
      required: [true, "Password is required for screen login"],
    },
    username: {
      type: String,
      unique: true,
    },
    playtimeCapacity: {
      type: Number,
      default: 8, // 8 hours by default
    },
    assignedManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Manager (ad-getter) assignment is required"],
    },
    assignedRunnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Runner assignment is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    // 1. Physical & Operational Details
    screenResolution: {
      type: String, // e.g., 1920x1080
      trim: true,
    },
    orientation: {
      type: String,
      enum: ['Landscape (Horizontal)', 'Portrait (Vertical)'],
    },
    supportedMediaTypes: {
      type: [String],
      enum: ['Video (.mp4)', 'Image (.png/.jpg)'],
    },
    // 2. Location & Geographic Tracking
    physicalAddress: {
      type: String,
      trim: true,
    },
    googleMapsLocation: {
      type: String, // Lat, Lng
      trim: true,
    },
    dailyFootfall: {
      type: Number,
    },
    // 3. Financial & Business Fields
    basePricePerSlot: {
      type: Number,
    },
    ownershipType: {
      type: String,
      enum: ['Owned', 'Rented', 'Franchise'],
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Screen = mongoose.model("Screen", screenSchema);
export default Screen;
