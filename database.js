const mongoose = require("mongoose");

let cachedConnection = null;

/**
 * Connect to MongoDB with caching for serverless environments (Vercel)
 * and standalone server environments (Local / Docker / PM2).
 */
const connectDB = async () => {
    // If connection is already established, return it
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // If connection is currently in progress, wait for existing promise
    if (mongoose.connection.readyState === 2 && cachedConnection) {
        return cachedConnection;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        const errorMsg = "CRITICAL: MONGODB_URI is not defined in environment variables! Please add MONGODB_URI in Vercel Dashboard (Project Settings > Environment Variables) or in your .env file.";
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        cachedConnection = mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
        });

        await cachedConnection;
        console.log("MongoDB connected successfully");
        return mongoose.connection;
    } catch (err) {
        cachedConnection = null;
        console.error("MongoDB connection failed:", err.message);
        throw err;
    }
};

module.exports = connectDB;
