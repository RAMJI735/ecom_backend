require("dotenv").config();
const app = require("./app");
const mongoose = require("mongoose");
const User = require("./model/User/UserModal");

const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/electrical_ecom";

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log("Database connected successfully");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Database connection error:", err);
    });

const signupHandler = async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const user = new User({ name, email, password, phone });
        await user.save();
        res.status(201).json({ message: "User created successfully", data: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};

const loginHandler = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        console.log(user, "user");
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const token = await user.createToken();
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000,
        });

        // Strip password before returning
        const userData = user.toObject ? user.toObject() : { ...user };
        delete userData.password;

        return res.status(200).json({
            status: 200,
            data: userData,
            token: token,
            message: "Login successful"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};

const logoutHandler = async (req, res) => {
    try {
        res.cookie("token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 0,
        });
        return res.status(200).json({ status: 200, data: [], message: "Logout successful" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Original routes
app.post("/signup/user", signupHandler);
app.post("/login/user", loginHandler);
app.post("/logout/user", logoutHandler);

// Standard auth routes
app.post("/auth/signup", signupHandler);
app.post("/auth/login", loginHandler);
app.post("/auth/logout", logoutHandler);
app.post("/api/auth/signup", signupHandler);
app.post("/api/auth/login", loginHandler);
app.post("/api/auth/logout", logoutHandler);
