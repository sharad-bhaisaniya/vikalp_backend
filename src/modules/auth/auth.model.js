import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Supported roles in Vikalp Promotions platform.
 * - super-admin: Global access, manages everything.
 * - city-admin: Scoped to a specific city (cityId required).
 * - ad-getter: Field agent who gets ads for customers.
 * - customer: End user who receives promotions.
 * - runner: Delivery/logistics role.
 */
const ROLES = ["super-admin", "city-admin", "ad-getter", "customer", "runner"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
      match: [
        /^[0-9]{10}$/,
        "Please provide a valid 10-digit mobile number",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: `Role must be one of: ${ROLES.join(", ")}`,
      },
      default: "customer",
    },
    /**
     * cityId: Required for city-admin, ad-getter, customer, runner.
     * Optional for super-admin (has global access).
     */
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    /**
     * registeredBy: Tracks who created/registered this user.
     * e.g., a city-admin registers an ad-getter.
     */
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Pre-save Hook: Hash password before saving ────────────────────────────
// Mongoose 9+: async middleware is resolved via Promise — do NOT call next()
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ─── Instance Method: Compare entered password with hashed ────────────────
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Virtual: Exclude sensitive data in JSON output ───────────────────────
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);
export default User;
