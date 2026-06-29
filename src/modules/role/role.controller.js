import * as roleService from "./role.service.js";

/**
 * @route   GET /api/roles
 * @desc    Get all roles with their permissions
 * @access  Private [super-admin, city-admin]
 */
export const getRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getAllRoles();
    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/roles/permissions
 * @desc    Get the full list of auto-generated available permissions
 * @access  Private [super-admin]
 */
export const getAvailablePermissions = async (req, res, next) => {
  try {
    const permissions = roleService.getAvailablePermissions();
    res.status(200).json({
      success: true,
      count: permissions.length,
      data: permissions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/roles/:id
 * @desc    Get a single role by ID
 * @access  Private [super-admin]
 */
export const getRoleById = async (req, res, next) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    res.status(200).json({
      success: true,
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/roles/:id/permissions
 * @desc    Update the permissions of a specific role
 * @access  Private [super-admin only]
 */
export const updateRolePermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      const error = new Error("permissions must be a non-empty array of permission strings.");
      error.statusCode = 400;
      return next(error);
    }

    const role = await roleService.updateRolePermissions(req.params.id, permissions);

    res.status(200).json({
      success: true,
      message: `Permissions updated for role '${role.name}'.`,
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/roles/sync
 * @desc    Re-sync all roles from the permissions.config.js defaults
 * @access  Private [super-admin only]
 */
export const syncRoles = async (req, res, next) => {
  try {
    const roles = await roleService.syncRolePermissions();
    res.status(200).json({
      success: true,
      message: "All roles synced from config successfully.",
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/roles
 * @desc    Create a new custom role
 * @access  Private [super-admin only]
 */
export const createRole = async (req, res, next) => {
  try {
    const role = await roleService.createRole(req.body);
    res.status(201).json({
      success: true,
      message: "Role created successfully.",
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/roles/:id
 * @desc    Delete a custom role
 * @access  Private [super-admin only]
 */
export const deleteRole = async (req, res, next) => {
  try {
    await roleService.deleteRole(req.params.id);
    res.status(200).json({
      success: true,
      message: "Role deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/roles/:id
 * @desc    Update a custom role's details and permissions
 * @access  Private [super-admin only]
 */
export const updateRole = async (req, res, next) => {
  try {
    const role = await roleService.updateRole(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Role updated successfully.",
      data: role,
    });
  } catch (error) {
    next(error);
  }
};
