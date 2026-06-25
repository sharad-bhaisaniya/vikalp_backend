import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./modules/auth/auth.routes.js";
import locationRoutes from "./modules/location/location.routes.js";
import roleRoutes from "./modules/role/role.routes.js";
import advertisementRoutes from "./modules/advertisement/advertisement.routes.js";
import payoutConfigRoutes from "./modules/payout-config/payout-config.routes.js";
import screenRoutes from "./modules/screen/screen.routes.js";
import walletRoutes from "./modules/wallet/wallet.routes.js";
import errorMiddleware from "./middlewares/errorMiddleware.js";

const app = express();

// ─── Core Middlewares ────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Static Files ────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── CORS (Basic — customize origin for production) ───────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Vikalp Promotions API is running 🚀",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/payout-config", payoutConfigRoutes);
app.use("/api/screens", screenRoutes);
app.use("/api/wallet", walletRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// ─── Centralized Error Handler ────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
