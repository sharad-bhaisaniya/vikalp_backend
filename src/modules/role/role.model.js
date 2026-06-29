import mongoose from "mongoose";
import { ROLE_NAMES, ALL_PERMISSION_NAMES } from "../../config/permissions.config.js";

const roleSchema = new mongoose.Schema(
  {
    /**
     * name: Must match one of the defined role keys.
     * Also matches the `role` string stored on the User model.
     */
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      index: true,
    },

    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    /**
     * permissions: Array of permission strings like 'auth:read', 'location:upload'.
     * '*' is reserved for super-admin as a wildcard granting all permissions.
     */
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: function (perms) {
          // Allow wildcard '*' or any valid permission string from ALL_PERMISSION_NAMES
          return perms.every(
            (p) => p === "*" || ALL_PERMISSION_NAMES.includes(p)
          );
        },
        message: (props) =>
          `Invalid permission(s) detected: ${props.value
            .filter((p) => p !== "*" && !ALL_PERMISSION_NAMES.includes(p))
            .join(", ")}`,
      },
    },

    /**
     * isSystem: System roles cannot be deleted (only their permissions can be updated).
     */
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Instance Method: Check if this role has a specific permission ─────────────
roleSchema.methods.hasPermission = function (permission) {
  return this.permissions.includes("*") || this.permissions.includes(permission);
};

const Role = mongoose.model("Role", roleSchema);
export default Role;
