import { walletService } from "./wallet.service.js";

class WalletController {
  // GET /api/wallet/all — Admin sees all wallets
  async getAllWallets(req, res) {
    try {
      const wallets = await walletService.getAllWallets();
      res.status(200).json({ success: true, data: wallets });
    } catch (error) {
      console.error("Error in getAllWallets:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // GET /api/wallet/:userId — Get wallet for a specific user
  async getWallet(req, res) {
    try {
      const { userId } = req.params;
      const wallet = await walletService.getWalletByUserId(userId);
      res.status(200).json({ success: true, data: wallet });
    } catch (error) {
      console.error("Error in getWallet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // POST /api/wallet/:userId/razorpay/order — Create Razorpay order
  async createRazorpayOrder(req, res) {
    try {
      const { userId } = req.params;
      const { amount } = req.body;
      if (!amount) return res.status(400).json({ message: "Amount is required" });
      const order = await walletService.createRazorpayOrder(userId, Number(amount));
      res.status(200).json({ success: true, ...order });
    } catch (error) {
      console.error("Error in createRazorpayOrder:", error);
      res.status(400).json({ message: error.message });
    }
  }

  // POST /api/wallet/:userId/razorpay/verify — Verify payment and credit
  async verifyRazorpayPayment(req, res) {
    try {
      const { userId } = req.params;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const result = await walletService.verifyRazorpayPayment(userId, {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in verifyRazorpayPayment:", error);
      res.status(400).json({ message: error.message });
    }
  }

  // POST /api/wallet/:userId/manual — Admin adds money manually
  async addManualPayment(req, res) {
    try {
      const { userId } = req.params;
      const { amount, reference_note, description } = req.body;
      if (!amount) return res.status(400).json({ message: "Amount is required" });
      // added_by comes from auth middleware (admin)
      const added_by_id = req.user?._id || null;
      const result = await walletService.addManualPayment(userId, {
        amount: Number(amount),
        reference_note,
        added_by_id,
        description,
      });
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in addManualPayment:", error);
      res.status(400).json({ message: error.message });
    }
  }
}

export const walletController = new WalletController();
