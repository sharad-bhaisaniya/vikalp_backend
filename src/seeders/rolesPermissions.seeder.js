/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Roles & Permissions Seeder — Vikalp Promotions
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTO-GENERATES and seeds all roles with their permissions into MongoDB.
 * Permissions are derived from src/config/permissions.config.js.
 *
 * Run this whenever:
 *   - You add a new module to permissions.config.js
 *   - You change default role-permission mappings
 *   - Initial project setup
 *
 * Command:
 *   npm run seed:roles
 *
 * This seeder is IDEMPOTENT — safe to run multiple times (upserts roles).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Role from "../modules/role/role.model.js";
import {
  generateAllPermissions,
  DEFAULT_ROLE_PERMISSIONS,
} from "../config/permissions.config.js";

const seedRolesAndPermissions = async () => {
  try {
    await connectDB();

    // ── Step 1: Display auto-generated permissions ──────────────────────────
    const allPermissions = generateAllPermissions();
    console.log("\n📋 Auto-Generated Permissions:");
    console.log("─────────────────────────────────────────────");
    allPermissions.forEach((p) => {
      console.log(`   ✓  ${p.name.padEnd(25)} → ${p.description}`);
    });
    console.log(`\n   Total: ${allPermissions.length} permissions across ${Object.keys(DEFAULT_ROLE_PERMISSIONS).length} modules\n`);

    // ── Step 2: Upsert all roles with their permissions ─────────────────────
    console.log("🔄 Seeding Roles...");
    console.log("─────────────────────────────────────────────");

    const results = [];

    for (const [name, config] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const role = await Role.findOneAndUpdate(
        { name },
        {
          name,
          displayName: config.displayName,
          description: config.description,
          permissions: config.permissions,
          isSystem: config.isSystem,
        },
        { upsert: true, returnDocument: "after", runValidators: false }
      );

      const permLabel =
        config.permissions.includes("*")
          ? "* (ALL PERMISSIONS — wildcard)"
          : config.permissions.join(", ");

      console.log(`   ✅  ${config.displayName.padEnd(18)} → [${permLabel}]`);
      results.push(role);
    }

    console.log("\n─────────────────────────────────────────────");
    console.log(`✅ ${results.length} roles seeded successfully!\n`);
    console.log("🚀 Your RBAC system is ready. Roles in DB:");
    results.forEach((r) =>
      console.log(`   • ${r.name} (${r.permissions.length} permission(s))`)
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Roles Seeder Error:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedRolesAndPermissions();
