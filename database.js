const mongoose = require("mongoose");

let connPromise = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;

    if (!connPromise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI is not defined");

        connPromise = mongoose
            .connect(uri, {
                maxPoolSize: 3,                  // 10 → 3 (har Vercel instance apna pool kholta hai)
                minPoolSize: 0,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferCommands: false,           // connect na ho to 10s hang ki jagah turant error
                autoIndex: process.env.NODE_ENV !== "production", // cold start pe index build nahi
            })
            .then((m) => {
                console.log("MongoDB connected");
                return m.connection;
            })
            .catch((err) => {
                connPromise = null;              // agli request retry kare
                throw err;
            });
    }
    return connPromise;
};

module.exports = connectDB;