import express from "express";
import {
  createScreen,
  getScreens,
  updateScreen,
  toggleScreenStatus,
  deleteScreen,
  getScreenAvailability,
  loginScreen,
} from "./screen.controller.js";
import { getPlaylistFeed } from "./screen-auth.controller.js";
import { protect, authorize, cityIsolation } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", loginScreen);

// Public or screen-token authenticated route
router.get("/:screenId/playlist-feed", getPlaylistFeed);

router.use(protect);

router
  .route("/")
  .get(cityIsolation, getScreens)
  .post(authorize("super-admin", "city-admin"), createScreen);

router
  .route("/:id")
  .put(authorize("super-admin", "city-admin"), updateScreen)
  .delete(authorize("super-admin"), deleteScreen);

router
  .route("/:id/status")
  .patch(authorize("super-admin", "city-admin", "ad-getter"), toggleScreenStatus);

router
  .route("/:id/availability")
  .get(getScreenAvailability);

export default router;
