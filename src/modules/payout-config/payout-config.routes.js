import express from "express";
import {
  getConfig,
  updateConfig,
  simulatePayout
} from "./payout-config.controller.js";

const router = express.Router();

router.get("/", getConfig);
router.post("/", updateConfig);
router.post("/simulate", simulatePayout);

export default router;
