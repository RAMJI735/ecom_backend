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

const app = express();

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
  res.status(200).json({
    message: "Electrical E-commerce API is running",
  });
});

// Cache Test Route
app.get("/api/cache-test", publicCache, (req, res) => {
  res.status(200).send("Cache Control example");
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

module.exports = app;
