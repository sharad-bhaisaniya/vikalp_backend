import jwt from "jsonwebtoken";
import User from "../modules/auth/auth.model.js";
import Role from "../modules/role/role.model.js";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * protect
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Verifies the Bearer JWT token.
 * 2. Loads the user from DB (excluding password).
 * 3. Loads the user's Role document and attaches permissions to req.user.
 *
 * After this middleware:
 *   req.user           → authenticated User document
 *   req.user.permissions → string[] from their Role (e.g. ['auth:read', '*'])
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      const error = new Error("Not authorized. No token provided.");
      error.statusCode = 401;
      return next(error);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      const error = new Error("User belonging to this token no longer exists.");
      error.statusCode = 401;
      return next(error);
    }

    if (user.status !== "active") {
      const error = new Error(
        "Your account has been suspended. Please contact support."
      );
      error.statusCode = 403;
      return next(error);
    }

    // ── Load role permissions from DB ─────────────────────────────────────────
    const roleDoc = await Role.findOne({ name: user.role });
    // Attach permissions to req.user — controllers/middleware can use this
    user._doc.permissions = roleDoc?.permissions || [];

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * hasPermission
 * ─────────────────────────────────────────────────────────────────────────────
 * Permission-based access control middleware factory.
 * Must be used AFTER protect (requires req.user.permissions to be set).
 *
 * Usage: hasPermission('location:upload')
 *
 * - Super-admin with '*' wildcard bypasses ALL permission checks.
 * - Other roles must explicitly have the required permission string.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const hasPermission = (permission) => {
  return (req, res, next) => {
    const permissions = req.user?._doc?.permissions || [];

    if (permissions.includes("*") || permissions.includes(permission)) {
      return next();
    }

    const error = new Error(
      `Access denied. You do not have the '${permission}' permission.`
    );
    error.statusCode = 403;
    next(error);
  };
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * authorize
 * ─────────────────────────────────────────────────────────────────────────────
 * Legacy role-name-based access control.
 * Kept for backwards compatibility and for cases where role-level access
 * (not permission-level) is sufficient.
 *
 * Usage: authorize('super-admin', 'city-admin')
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const error = new Error(
        `Access denied. Role '${req.user.role}' is not authorized for this action.`
      );
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * cityIsolation
 * ─────────────────────────────────────────────────────────────────────────────
 * Enforces data scoping for city-admin:
 *   - city-admin → req.cityFilter = { cityId: req.user.cityId }
 *   - super-admin → req.cityFilter = {} (no restriction)
 *   - other roles → req.cityFilter = { cityId: req.user.cityId }
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const cityIsolation = (req, res, next) => {
  if (req.user.role === "city-admin") {
    if (!req.user.cityId) {
      const error = new Error(
        "City Admin account is not linked to any city. Contact Super Admin."
      );
      error.statusCode = 403;
      return next(error);
    }
    req.cityFilter = { cityId: req.user.cityId };
  } else if (req.user.role === "super-admin") {
    req.cityFilter = {};
  } else {
    req.cityFilter = { cityId: req.user.cityId };
  }
  next();
};
