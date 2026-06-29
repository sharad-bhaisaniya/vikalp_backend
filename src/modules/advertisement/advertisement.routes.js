import { Router } from "express";
import { advertisementController } from "./advertisement.controller.js";
import { upload } from "../../middlewares/uploadMiddleware.js";

const router = Router();

// Endpoint for screen media player
router.get("/next", advertisementController.getNextAd);
router.post("/log-play", advertisementController.logPlay);

// Admin endpoints
router.get("/global-settings", advertisementController.getGlobalSettings);
router.put("/global-settings", advertisementController.updateGlobalSettings);
router.get("/dashboard-stats", advertisementController.getDashboardStats);
router.get("/bookings", advertisementController.getAllBookings);
router.post("/check-availability", advertisementController.checkAvailability);
router.post("/runner/:runnerId/slot-availability", advertisementController.getRunnerSlotAvailability);
router.post("/upload-media", upload.single("media"), advertisementController.uploadMedia);
router.patch("/:id/media", advertisementController.updateAdvertisementMedia);
router.post("/", advertisementController.createAdvertisement);

export default router;
