import { Router } from "express";
import {
  getRoles,
  getRoleById,
  getAvailablePermissions,
  updateRolePermissions,
  syncRoles,
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
 */
router.get(
  "/",
  protect,
  hasPermission("role:read"),
  getRoles
);

/**
 * GET    /api/roles/:id              → Get role by ID
 * PATCH  /api/roles/:id/permissions  → Update role permissions (super-admin)
 */
router.get(
  "/:id",
  protect,
  hasPermission("role:read"),
  getRoleById
);

router.patch(
  "/:id/permissions",
  protect,
  hasPermission("role:update"),
  updateRolePermissions
);

export default router;
