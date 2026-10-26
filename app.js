const express = require("express");
const cors = require("cors");

const serviceCategoryRoutes = require("./routes/serviceCategoryRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");
const technicianRoutes = require("./routes/technicianRoutes");
const taskRoutes = require("./routes/taskRoutes");

const compression = require("compression");
const mongoose = require("mongoose");
const connectDB = require("./database");

const app = express();

// Trust reverse proxy (Vercel, Render, Nginx) in production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Performance: Gzip / Deflate compression for all responses
app.use(compression());

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const publicCache = require("./utils/cacheMiddleware");

// Health Check / Root Route
app.get("/", (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbStatus = dbStates[mongoose.connection.readyState] || "unknown";

  res.status(200).json({
    message: "Electrical E-commerce API is running",
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
    hasMongoUri: Boolean(process.env.MONGODB_URI),
  });
});

// Cache Test Route
app.get("/api/cache-test", publicCache, (req, res) => {
  res.status(200).send("Cache Control example");
});

// Database connection middleware for Serverless (Vercel) & traditional hosting
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB connection middleware error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Database connection failed. Please ensure MONGODB_URI is configured in Vercel Environment Variables and MongoDB Atlas allows 0.0.0.0/0 network access.",
      error: error.message,
    });
  }
});

// API Routes
app.use("/api/service-categories", serviceCategoryRoutes);
app.use("/api/categories", serviceCategoryRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/products", serviceRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/service-requests", taskRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    console.error("Unhandled Error:", err);
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

module.exports = app;
