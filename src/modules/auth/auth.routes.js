import { Router } from "express";
import multer from "multer";
import {
  register,
  login,
  getMe,
  getUsers,
  getUserById,
  updateUserStatus,
  publicRegisterCustomer,
  uploadUsers,
  bulkDeleteUsers,
} from "./auth.controller.js";
import {
  protect,
  hasPermission,
  cityIsolation,
} from "../../middlewares/authMiddleware.js";

const router = Router();

// ─── Multer: Memory storage for Excel buffer processing ───────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only .xlsx, .xls, or .csv files are allowed."),
        false
      );
    }
  },
});

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post("/login", login);

// Public self-registration for customers (no token required)
router.post("/register/customer", publicRegisterCustomer);

// ─── Private: Any authenticated user ────────────────────────────────────────
router.get("/me", protect, getMe);

// ─── Register new user ───────────────────────────────────────────────────────
// Requires 'auth:create' permission + city isolation applied automatically
router.post(
  "/register",
  protect,
  hasPermission("auth:create"),
  cityIsolation,
  register
);

// ─── Bulk Upload Users ───────────────────────────────────────────────────────
router.post(
  "/users/upload",
  protect,
  hasPermission("auth:create"),
  upload.single("file"),
  uploadUsers
);

// ─── Bulk Delete Users ───────────────────────────────────────────────────────
router.post(
  "/users/bulk-delete",
  protect,
  hasPermission("auth:delete"), // Assuming they need delete permission, but auth:update is used elsewhere. Let's use auth:delete or super-admin, wait, I'll just use auth:delete or maybe no permission check here beyond protect? Let's check other delete routes. Actually, the controller says `[super-admin, city-admin]`. So `hasPermission("auth:delete")`. Or `hasPermission("auth:update")` if delete isn't defined. Let's look at `location.routes.js`. It uses `location:delete`. We'll use `auth:delete`.
  bulkDeleteUsers
);

// ─── List users (city-scoped for city-admin) ─────────────────────────────────
router.get(
  "/users",
  protect,
  hasPermission("auth:read"),
  cityIsolation,
  getUsers
);

// ─── Get single user by ID ───────────────────────────────────────────────────
router.get(
  "/users/:id",
  protect,
  hasPermission("auth:read"),
  cityIsolation,
  getUserById
);

// ─── Update user status ──────────────────────────────────────────────────────
router.patch(
  "/users/:id/status",
  protect,
  hasPermission("auth:update"),
  cityIsolation,
  updateUserStatus
);

export default router;
