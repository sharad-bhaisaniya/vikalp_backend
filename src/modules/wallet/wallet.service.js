import Razorpay from "razorpay";
import crypto from "crypto";
import Wallet from "./wallet.model.js";
import User from "../auth/auth.model.js";

// Initialize Razorpay (will use env vars; falls back to test keys)
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_FJYTnEjRKeWmIK",
//   key_secret: process.env.RAZORPAY_KEY_SECRET || "E2vdTNgDooTfPluYMZmxtXqQ",
// });
const razorpay = new Razorpay({
  key_id: "rzp_test_FJYTnEjRKeWmIK",
  key_secret: "E2vdTNgDooTfPluYMZmxtXqQ",
});

class WalletService {
  // Get or create wallet for a user
  async getOrCreateWallet(userId) {
    let wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0, wallet_balance: 0, held_balance: 0, transactions: [] });
    } else {
      // Sync legacy wallet_balance to balance
      if (wallet.wallet_balance > 0 && wallet.balance === 0) {
        wallet.balance = wallet.wallet_balance;
        wallet.wallet_balance = 0; // clear legacy
        await wallet.save();
      }
    }
    return wallet;
  }

  // Get wallet with user info
  async getWalletByUserId(userId) {
    const wallet = await this.getOrCreateWallet(userId);
    const user = await User.findById(userId).select("name email mobile role");
    return {
      wallet_id: wallet._id,
      user_id: userId,
      user,
      balance: wallet.balance,
      held_balance: wallet.held_balance || 0,
      transactions: wallet.transactions
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50),
    };
  }

  // Get all wallets (admin)
  async getAllWallets() {
    const wallets = await Wallet.find()
      .populate("user_id", "name email mobile role status")
      .sort({ updatedAt: -1 });
    return wallets.map(w => ({
      wallet_id: w._id,
      user: w.user_id,
      balance: w.balance,
      held_balance: w.held_balance || 0,
      transaction_count: w.transactions.length,
      last_updated: w.updatedAt,
    }));
  }

  // Create Razorpay order
  async createRazorpayOrder(userId, amount) {
    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const amountInPaise = Math.round(amount * 100); // Razorpay takes paise

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      notes: { userId: userId.toString() },
    });

    // Create a pending transaction
    const wallet = await this.getOrCreateWallet(userId);
    wallet.transactions.push({
      type: "credit",
      amount,
      method: "razorpay",
      status: "pending",
      razorpay_order_id: order.id,
      description: `Razorpay top-up ₹${amount}`,
    });
    await wallet.save();

    return {
      order_id: order.id,
      amount,
      currency: "INR",
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
    };
  }

  // Verify Razorpay payment and credit wallet
  async verifyRazorpayPayment(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;
    if (!isValid) throw new Error("Invalid payment signature");

    // Find the pending transaction and update it
    const wallet = await this.getOrCreateWallet(userId);
    const txn = wallet.transactions.find(t => t.razorpay_order_id === razorpay_order_id);
    if (!txn) throw new Error("Transaction not found");

    txn.status = "success";
    txn.razorpay_payment_id = razorpay_payment_id;
    txn.razorpay_signature = razorpay_signature;

    wallet.balance += txn.amount;
    await wallet.save();

    return { success: true, new_balance: wallet.balance, amount_credited: txn.amount };
  }

  // Manual payment (admin adds money directly)
  async addManualPayment(userId, { amount, reference_note, added_by_id, description }) {
    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const wallet = await this.getOrCreateWallet(userId);
    wallet.balance += amount;
    wallet.transactions.push({
      type: "credit",
      amount,
      method: "manual",
      status: "success",
      reference_note: reference_note || "",
      added_by: added_by_id || null,
      description: description || `Manual top-up ₹${amount}`,
    });
    await wallet.save();

    return { success: true, new_balance: wallet.balance, amount_credited: amount };
  }

  // Deduct from wallet (used during slot booking without hold)
  async deductFromWallet(userId, amount, description) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.balance < amount) throw new Error("Insufficient wallet balance");

    wallet.balance -= amount;
    wallet.transactions.push({
      type: "debit",
      amount,
      method: "system",
      status: "success",
      description: description || `Slot booking deduction ₹${amount}`,
    });
    await wallet.save();

    return { success: true, new_balance: wallet.balance, amount_deducted: amount };
  }

  // Hold amount in wallet (used during ad creation)
  async holdAmount(userId, amount, description) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.balance < amount) throw new Error("Insufficient available balance to hold this amount");

    wallet.balance -= amount;
    wallet.held_balance = (wallet.held_balance || 0) + amount;
    
    wallet.transactions.push({
      type: "hold",
      amount,
      method: "system",
      status: "success",
      description: description || `Funds held for slot booking ₹${amount}`,
    });
    await wallet.save();

    return { success: true, new_balance: wallet.balance, held_balance: wallet.held_balance, amount_held: amount };
  }

  // Settle hold (deducts held money permanently)
  async settleHold(userId, amount, description) {
    const wallet = await this.getOrCreateWallet(userId);
    if ((wallet.held_balance || 0) < amount) throw new Error("Insufficient held balance to settle");

    wallet.held_balance -= amount;
    
    wallet.transactions.push({
      type: "debit",
      amount,
      method: "system",
      status: "success",
      description: description || `Settled held funds ₹${amount}`,
    });
    await wallet.save();

    return { success: true, held_balance: wallet.held_balance, amount_settled: amount };
  }
}

export const walletService = new WalletService();
