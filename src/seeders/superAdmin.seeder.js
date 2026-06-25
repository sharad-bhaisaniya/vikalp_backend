/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Super Admin Seeder — Vikalp Promotions
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the initial Super Admin account in MongoDB.
 * Run once during project setup:
 *
 *   npm run seed
 *   OR
 *   node src/seeders/superAdmin.seeder.js
 *
 * Credentials are read from .env:
 *   SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD
 * ─────────────────────────────────────────────────────────────────────────────
 */

import "dotenv/config";
import mongoose from "mongoose";
import User from "../modules/auth/auth.model.js";
import connectDB from "../config/db.js";

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const name = process.env.SUPER_ADMIN_NAME || "Super Admin";
    const mobile = process.env.SUPER_ADMIN_MOBILE || "1234567890";
    const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@vikalp.com";
    const password = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123";

    // ── Check if super-admin already exists ──────────────────────────────────
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log(`\n⚠️  Super Admin already exists with email: ${email}`);
      console.log("   Seeder skipped. No changes made.");
      await mongoose.disconnect();
      process.exit(0);
    }

    // ── Create super-admin ───────────────────────────────────────────────────
    const superAdmin = await User.create({
      name,
      email,
      mobile,
      password,       // Will be hashed by the pre-save hook in auth.model.js
      role: "super-admin",
      cityId: null,   // Super admin has global access — no city restriction
      status: "active",
    });

    console.log("\n✅ Super Admin seeded successfully!");
    console.log("─────────────────────────────────────");
    console.log(`   Name     : ${superAdmin.name}`);
    console.log(`   Email    : ${superAdmin.email}`);
    console.log(`   Role     : ${superAdmin.role}`);
    console.log(`   Status   : ${superAdmin.status}`);
    console.log(`   ID       : ${superAdmin._id}`);
    console.log("─────────────────────────────────────");
    console.log("\n🔐 Use the above credentials to log in and start managing the platform.");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeder Error:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedSuperAdmin();
