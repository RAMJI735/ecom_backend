const User = require("../model/User/UserModal");

/**
 * Helper to send token response and set auth cookie
 */
const sendTokenResponse = async (user, statusCode, res, message = "Success") => {
    const token = await user.createToken();

    const options = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        sameSite: "lax",
    };

    if (process.env.NODE_ENV === "production") {
        options.secure = true;
    }

    const userData = {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        companyName: user.companyName || "",
        gstin: user.gstin || "",
        role: user.role || "user",
        avatar: user.avatar || "",
    };

    res.cookie("token", token, options);

    return res.status(statusCode).json({
        success: true,
        message,
        token,
        data: userData,
    });
};

/**
 * POST /api/auth/signup or /api/auth/register or /signup/user
 * Register a new user
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone, companyName, gstin } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "An account with this email address already exists. Please log in.",
            });
        }

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password,
            phone: phone ? phone.trim() : "",
            companyName: companyName ? companyName.trim() : "",
            gstin: gstin ? gstin.trim() : "",
            role: "user",
        });

        return sendTokenResponse(user, 201, res, "User registered successfully");
    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to register user",
        });
    }
};

/**
 * POST /api/auth/login or /login/user
 * Authenticate user & return JWT token
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        return sendTokenResponse(user, 200, res, "Logged in successfully");
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to log in",
        });
    }
};

/**
 * GET /api/auth/me
 * Get current logged in user details
 */
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId || req.user?._id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error("Get me error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch user profile",
        });
    }
};

/**
 * POST /api/auth/logout or /logout/user
 * Log out user & clear cookie
 */
exports.logout = async (req, res) => {
    try {
        res.cookie("token", "none", {
            expires: new Date(Date.now() + 2000),
            httpOnly: true,
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to log out",
        });
    }
};

