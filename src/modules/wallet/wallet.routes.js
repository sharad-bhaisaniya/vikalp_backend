import { Router } from "express";
import { walletController } from "./wallet.controller.js";

const router = Router();

// Get all wallets (admin view)
router.get("/all", walletController.getAllWallets);

// Get wallet for a specific user
router.get("/:userId", walletController.getWallet);

// Razorpay: create order
router.post("/:userId/razorpay/order", walletController.createRazorpayOrder);

// Razorpay: verify payment and credit wallet
router.post("/:userId/razorpay/verify", walletController.verifyRazorpayPayment);

// Manual: admin adds money directly
router.post("/:userId/manual", walletController.addManualPayment);

export default router;
