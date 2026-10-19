const express = require("express");
const cors = require("cors");

const serviceCategoryRoutes = require("./routes/serviceCategoryRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");
const technicianRoutes = require("./routes/technicianRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

// Middlewares
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:19006",
  "http://127.0.0.1:8081",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Requests without Origin, such as server-to-server requests
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check / Root Route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Electrical E-commerce API is running",
  });
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
