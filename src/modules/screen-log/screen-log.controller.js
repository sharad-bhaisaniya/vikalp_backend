import mongoose from "mongoose";
import ScreenLog from "./screen-log.model.js";
import Screen from "../screen/screen.model.js";
import Wallet from "../wallet/wallet.model.js";
import WalletHistory from "../wallet/history.model.js";
import Advertisement from "../advertisement/advertisement.model.js";
// Assuming payout config is available via some service, or we use a basic static map for demo
// import { getPayoutConfig } from "../payout-config/payout-config.service.js";

/**
 * Tracks physical screen log events and deducts wallet balance transactionally.
 */
export const trackScreenPlayback = async (req, res) => {
  const { screenId, campaignId, actual_duration_seconds } = req.body;

  if (!screenId || !campaignId || !actual_duration_seconds) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  // Start MongoDB session for ACID transactions
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch Screen & Campaign details
    const screen = await Screen.findById(screenId).session(session);
    if (!screen) {
      throw new Error("Screen not found");
    }

    const campaign = await Advertisement.findById(campaignId).session(session);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const userWallet = await Wallet.findOne({ user_id: campaign.user_id }).session(session);
    if (!userWallet) {
      throw new Error("User wallet not found");
    }

    // Determine the base price per second (assuming basePricePerSlot / some duration, or a direct field)
    // Here we'll use a hypothetical basePricePerSecond derived or stored. 
    // Fallback to a default if not present.
    const basePricePerSecond = screen.basePricePerSlot ? (screen.basePricePerSlot / 10) : 1; 

    // 2. Micro-Deduction Engine
    const consumedAmount = Number((actual_duration_seconds * basePricePerSecond).toFixed(4));

    if (userWallet.held_balance < consumedAmount) {
      throw new Error("Insufficient held balance for this consumption");
    }

    // 3. Atomically deduct held_balance
    await Wallet.updateOne(
      { _id: userWallet._id },
      { $inc: { held_balance: -consumedAmount } },
      { session }
    );

    // Create tracking log
    const screenLog = new ScreenLog({
      screenId,
      campaignId,
      actual_duration_seconds,
      consumedAmount,
      status: "processed",
      processedAt: new Date()
    });
    await screenLog.save({ session });

    // 4. The Payout Distribution Hook
    // E.g., admin 20%, city-admin 10%, ad-getter 30%, runner 40%
    const payoutSplit = {
      admin: consumedAmount * 0.2,
      city_admin: consumedAmount * 0.1,
      ad_getter: consumedAmount * 0.3,
      runner: consumedAmount * 0.4
    };

    // Log the deduction from user
    const historyDeduction = new WalletHistory({
      wallet_id: userWallet._id,
      user_id: userWallet.user_id,
      type: "ad_play_deduction",
      amount: -consumedAmount,
      metadata: {
        screenId,
        campaignId,
        actual_duration_seconds,
        payout_split: payoutSplit
      }
    });
    await historyDeduction.save({ session });

    // Ideally, credit other wallets here (admin, city-admin, etc) via similar queries
    // Example:
    // await creditWallet(adminWalletId, payoutSplit.admin, session); ...

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Playback logged and balances updated successfully",
      consumedAmount
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transaction Error:", error.message);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};
