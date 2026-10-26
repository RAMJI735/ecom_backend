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

module.exports = app;
