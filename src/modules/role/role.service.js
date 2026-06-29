import Role from "./role.model.js";
import {
  generateAllPermissions,
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSION_NAMES,
} from "../../config/permissions.config.js";

/**
 * getAllRoles
 * Returns all roles with their permissions.
 */
export const getAllRoles = async () => {
  return await Role.find().sort({ createdAt: 1 });
};

/**
 * getRoleByName
 * Fetch a role by its name (e.g., 'city-admin').
 */
export const getRoleByName = async (name) => {
  const role = await Role.findOne({ name });
  if (!role) {
    const error = new Error(`Role '${name}' not found.`);
    error.statusCode = 404;
    throw error;
  }
  return role;
};

/**
 * getRoleById
 */
export const getRoleById = async (id) => {
  const role = await Role.findById(id);
  if (!role) {
    const error = new Error("Role not found.");
    error.statusCode = 404;
    throw error;
  }
  return role;
};

/**
 * updateRolePermissions
 * Updates the permissions array of a role.
 * Validates that all provided permissions are valid.
 * System roles cannot have their name or isSystem flag changed.
 */
export const updateRolePermissions = async (roleId, permissions) => {
  // Validate permissions
  const invalid = permissions.filter(
    (p) => p !== "*" && !ALL_PERMISSION_NAMES.includes(p)
  );

  if (invalid.length > 0) {
    const error = new Error(
      `Invalid permission(s): ${invalid.join(", ")}. Available: ${ALL_PERMISSION_NAMES.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  const role = await Role.findByIdAndUpdate(
    roleId,
    { permissions },
    { new: true, runValidators: true }
  );

  if (!role) {
    const error = new Error("Role not found.");
    error.statusCode = 404;
    throw error;
  }

  return role;
};

/**
 * getAvailablePermissions
 * Returns the auto-generated list of all possible permissions.
 * Useful for frontend to build a permission selection UI.
 */
export const getAvailablePermissions = () => {
  return generateAllPermissions();
};

/**
 * syncRolePermissions
 * Upserts all roles from DEFAULT_ROLE_PERMISSIONS config.
 * Called by the seeder and can be called manually to re-sync.
 */
export const syncRolePermissions = async () => {
  const results = [];

  for (const [name, config] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await Role.findOneAndUpdate(
      { name },
      {
        name,
        displayName: config.displayName,
        description: config.description,
        permissions: config.permissions,
        isSystem: config.isSystem,
      },
      { upsert: true, returnDocument: "after", runValidators: true }
    );
    results.push(role);
  }

  return results;
};

/**
 * createRole
 * Creates a new custom role.
 */
export const createRole = async (roleData) => {
  // Validate permissions
  if (roleData.permissions) {
    const invalid = roleData.permissions.filter(
      (p) => p !== "*" && !ALL_PERMISSION_NAMES.includes(p)
    );

    if (invalid.length > 0) {
      const error = new Error(
        `Invalid permission(s): ${invalid.join(", ")}. Available: ${ALL_PERMISSION_NAMES.join(", ")}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const role = new Role({
    name: roleData.name,
    displayName: roleData.displayName,
    description: roleData.description,
    permissions: roleData.permissions || [],
    isSystem: false, // Manual roles are never system roles
  });

  await role.save();
  return role;
};

/**
 * deleteRole
 * Deletes a custom role. Cannot delete system roles.
 */
export const deleteRole = async (roleId) => {
  const role = await Role.findById(roleId);
  if (!role) {
    const error = new Error("Role not found.");
    error.statusCode = 404;
    throw error;
  }

  if (role.isSystem) {
    const error = new Error("System roles cannot be deleted.");
    error.statusCode = 403;
    throw error;
  }

  await Role.findByIdAndDelete(roleId);
  return true;
};

/**
 * updateRole
 * Updates a custom role's details and permissions.
 */
export const updateRole = async (roleId, roleData) => {
  const role = await Role.findById(roleId);
  if (!role) {
    const error = new Error("Role not found.");
    error.statusCode = 404;
    throw error;
  }

  if (role.isSystem) {
    const error = new Error("System roles cannot have their name or details updated. Only permissions.");
    error.statusCode = 403;
    throw error;
  }

  // Validate permissions
  if (roleData.permissions) {
    const invalid = roleData.permissions.filter(
      (p) => p !== "*" && !ALL_PERMISSION_NAMES.includes(p)
    );

    if (invalid.length > 0) {
      const error = new Error(
        `Invalid permission(s): ${invalid.join(", ")}. Available: ${ALL_PERMISSION_NAMES.join(", ")}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  role.name = roleData.name || role.name;
  role.displayName = roleData.displayName || role.displayName;
  role.description = roleData.description !== undefined ? roleData.description : role.description;
  if (roleData.permissions) {
    role.permissions = roleData.permissions;
  }

  await role.save();
  return role;
};
