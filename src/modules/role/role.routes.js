import { Router } from "express";
import {
  getRoles,
  getRoleById,
  getAvailablePermissions,
  updateRolePermissions,
  syncRoles,
  createRole,
  deleteRole,
  updateRole,
} from "./role.controller.js";
import { protect, hasPermission } from "../../middlewares/authMiddleware.js";

const router = Router();

/**
 * GET  /api/roles/permissions  → List all auto-generated available permissions (super-admin)
 * Must be before /:id to avoid route conflict
 */
router.get(
  "/permissions",
  protect,
  hasPermission("role:read"),
  getAvailablePermissions
);

/**
 * POST /api/roles/sync  → Re-sync roles from config (super-admin only)
 */
router.post(
  "/sync",
  protect,
  hasPermission("role:update"),
  syncRoles
);

/**
 * GET  /api/roles      → List all roles with permissions
 * POST /api/roles      → Create a new role
 */
router.route("/")
  .get(protect, hasPermission("role:read"), getRoles)
  .post(protect, hasPermission("role:create"), createRole);

/**
 * GET    /api/roles/:id              → Get role by ID
 * PUT    /api/roles/:id              → Update a role
 * DELETE /api/roles/:id              → Delete a role
 */
router.route("/:id")
  .get(protect, hasPermission("role:read"), getRoleById)
  .put(protect, hasPermission("role:update"), updateRole)
  .delete(protect, hasPermission("role:delete"), deleteRole);

router.patch(
  "/:id/permissions",
  protect,
  hasPermission("role:update"),
  updateRolePermissions
);

export default router;
