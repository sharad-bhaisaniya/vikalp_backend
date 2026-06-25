/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PERMISSIONS CONFIG — Vikalp Promotions
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Central registry for all modules and their allowed actions.
 * Permissions are AUTO-GENERATED as "module:action" strings from this config.
 *
 * To add a new module/feature:
 *   1. Add it to MODULES below with its allowed actions.
 *   2. Run `npm run seed:roles` to regenerate and upsert roles in DB.
 *   3. Assign the new permissions to roles in DEFAULT_ROLE_PERMISSIONS.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Module Definitions ───────────────────────────────────────────────────────
export const MODULES = {
  auth: {
    description: "User account management",
    actions: ["create", "read", "update", "delete"],
  },
  location: {
    description: "City/location management",
    actions: ["create", "read", "update", "delete", "upload"],
  },
  role: {
    description: "Role & permission management",
    actions: ["create", "read", "update", "delete"],
  },
};

// ─── Auto-Generate All Permission Strings ─────────────────────────────────────
/**
 * Generates all permission strings from the MODULES config.
 * Example output: ['auth:create', 'auth:read', ..., 'location:upload', ...]
 *
 * @returns {Array<{ name: string, module: string, action: string, description: string }>}
 */
export const generateAllPermissions = () => {
  const permissions = [];

  for (const [moduleName, config] of Object.entries(MODULES)) {
    for (const action of config.actions) {
      permissions.push({
        name: `${moduleName}:${action}`,
        module: moduleName,
        action,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${config.description}`,
      });
    }
  }

  return permissions;
};

// ─── Convenience: All permission strings as flat array ────────────────────────
export const ALL_PERMISSION_NAMES = generateAllPermissions().map((p) => p.name);

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT ROLE → PERMISSION MAPPINGS
// ─────────────────────────────────────────────────────────────────────────────
// '*' = Wildcard: grants all permissions (used for super-admin only)
// All other roles list explicit permissions they are allowed to perform.
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_ROLE_PERMISSIONS = {
  "super-admin": {
    displayName: "Super Admin",
    description: "Global administrator with unrestricted access to all features.",
    permissions: ["*"], // Wildcard — all current & future permissions
    isSystem: true,
  },

  "city-admin": {
    displayName: "City Admin",
    description: "Manages users and data within their assigned city.",
    permissions: [
      "auth:create",   // Register new users in their city
      "auth:read",     // View users in their city
      "auth:update",   // Update user details in their city
      "location:read", // View locations (read-only for non-super-admin)
      "role:read",     // View available roles
    ],
    isSystem: true,
  },

  "ad-getter": {
    displayName: "Ad Getter",
    description: "Field agent responsible for collecting and delivering promotions.",
    permissions: [
      "auth:read",     // View own profile
      "location:read", // Browse locations
    ],
    isSystem: true,
  },

  "customer": {
    displayName: "Customer",
    description: "End user who receives promotional content.",
    permissions: [
      "auth:read",     // View own profile
      "location:read", // Search locations
    ],
    isSystem: true,
  },

  "runner": {
    displayName: "Runner",
    description: "Delivery/logistics agent handling physical distribution.",
    permissions: [
      "auth:read",     // View own profile
      "location:read", // View assigned location routes
    ],
    isSystem: true,
  },
};

// ─── Role Names (convenience export) ─────────────────────────────────────────
export const ROLE_NAMES = Object.keys(DEFAULT_ROLE_PERMISSIONS);
