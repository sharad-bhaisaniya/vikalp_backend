import { Router } from "express";
import multer from "multer";
import {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  uploadLocations,
  bulkDeleteLocations,
} from "./location.controller.js";
import { protect, hasPermission } from "../../middlewares/authMiddleware.js";

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

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET  /api/locations  → Search/list locations — any authenticated user with 'location:read'
 * POST /api/locations  → Create single location — requires 'location:create'
 */
router
  .route("/")
  .get(protect, hasPermission("location:read"), getLocations)
  .post(protect, hasPermission("location:create"), createLocation);

/**
 * POST /api/locations/upload → Bulk Excel upload — requires 'location:upload'
 * Declared BEFORE /:id to avoid route conflict
 */
router.post(
  "/upload",
  protect,
  hasPermission("location:upload"),
  upload.single("file"),
  uploadLocations
);

/**
 * POST /api/locations/bulk-delete → Bulk delete locations
 */
router.post(
  "/bulk-delete",
  protect,
  hasPermission("location:delete"),
  bulkDeleteLocations
);

/**
 * GET    /api/locations/:id → requires 'location:read'
 * PUT    /api/locations/:id → requires 'location:update'
 * DELETE /api/locations/:id → requires 'location:delete'
 */
router
  .route("/:id")
  .get(protect, hasPermission("location:read"), getLocation)
  .put(protect, hasPermission("location:update"), updateLocation)
  .delete(protect, hasPermission("location:delete"), deleteLocation);

export default router;
