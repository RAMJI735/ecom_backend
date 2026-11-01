require("dotenv").config();
const app = require("./app");
const connectDB = require("./database");
const User = require("./model/User/UserModal");

const PORT = process.env.PORT || 8000;

// Start server when run directly (local / container / VM)
if (require.main === module || !process.env.VERCEL) {
    connectDB()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`Server is running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
            });
        })
        .catch((err) => {
            console.error("Initial database connection error:", err.message);
        });
}

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
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const token = await user.createToken();
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
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
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", "", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 0,
        });
        return res.status(200).json({ status: 200, data: [], message: "Logout successful" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};

const jwt = require("jsonwebtoken");

const updateProfileHandler = async (req, res) => {
    try {
        let userId = req.body.userId || req.body._id;
        if (!userId) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                try {
                    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET || "electrical_ecom_secret_key_2026");
                    userId = decoded.id || decoded._id;
                } catch (e) {}
            }
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: "User authentication required" });
        }

        const { name, phone, companyName, gstin, avatar } = req.body;
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (phone !== undefined) updateData.phone = phone.trim();
        if (companyName !== undefined) updateData.companyName = companyName.trim();
        if (gstin !== undefined) updateData.gstin = gstin.trim();
        if (avatar !== undefined) updateData.avatar = avatar.trim();

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password");
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            status: 200,
            message: "Profile updated successfully",
            data: updatedUser,
        });
    } catch (err) {
        console.error("Profile update error:", err);
        return res.status(500).json({ success: false, message: "Failed to update profile", error: err.message });
    }
};

const getProfileHandler = async (req, res) => {
    try {
        let userId = req.query.userId || req.params.userId;
        if (!userId) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                try {
                    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET || "electrical_ecom_secret_key_2026");
                    userId = decoded.id || decoded._id;
                } catch (e) {}
            }
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: "User authentication required" });
        }

        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            status: 200,
            data: user,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Failed to get profile" });
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

// Profile routes
app.put("/auth/profile", updateProfileHandler);
app.put("/api/auth/profile", updateProfileHandler);
app.get("/auth/profile", getProfileHandler);
app.get("/api/auth/profile", getProfileHandler);

module.exports = app;
