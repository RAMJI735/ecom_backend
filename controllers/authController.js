const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../model/User/UserModal");
const wrapAsync = require("../utils/wrapAsync");
const { client, connectRedis } = require("../utils/redis");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

/**
 * Helper to send token response and set auth cookie
 */
const sendTokenResponse = async (user, statusCode, res, message = "Success", req = null) => {
    const token = await user.createToken();
    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || "electrical_ecom_secret_key_2026",
        {
            expiresIn: process.env.JWT_EXPIRES_REFRESH || "7d"
        }
    );

    // Hash refresh token and persist in database
    const HashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await User.findByIdAndUpdate(user._id, { refreshToken: HashedRefreshToken });

    const reqObj = req || res.req;
    const isHttps = Boolean(
        process.env.NODE_ENV === "production" &&
        reqObj &&
        (reqObj.secure || reqObj.headers?.["x-forwarded-proto"] === "https")
    );

    const options = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? "none" : "lax",
        path: "/",
    };

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
    res.cookie("refreshToken", refreshToken, options);

    return res.status(statusCode).json({
        success: true,
        message,
        token,
        refreshToken,
        data: {
            ...userData,
            token,
            refreshToken,
        },
    });
};

/**
 * POST /api/auth/signup or /api/auth/register or /signup/user
 * Register a new user
 */
const register = async (req, res) => {
    const { name, email, password, phone, companyName, gstin, otp } = req.body;

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

    // If OTP is provided during registration, verify against Redis
    if (otp !== undefined && otp !== null && String(otp).trim() !== "") {
        await connectRedis();
        const storedOtp = await client.get(`otp:${normalizedEmail}`);
        if (!storedOtp) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired or was not requested. Please request a new OTP.",
            });
        }
        if (String(otp).trim() !== String(storedOtp) && (process.env.NODE_ENV === "production" || String(otp).trim() !== "11111")) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please check and try again.",
            });
        }
        // Delete OTP after successful registration
        await client.del(`otp:${normalizedEmail}`);
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
};

/**
 * POST /api/auth/login or /login/user
 * Authenticate user & return JWT token
 */
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Please provide email and password",
        });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+password -token");

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
};

/**
 * GET /api/auth/me
 * Get current logged in user details
 */
const getMe = async (req, res) => {
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
};

/**
 * POST /api/auth/logout or /logout/user
 * Log out user & clear cookies
 */
const logout = async (req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    const clearOptions = {
        expires: new Date(0),
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
    };

    res.cookie("token", "", clearOptions);
    res.cookie("refreshToken", "", clearOptions);

    return res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};

/**
 * POST /api/auth/send-otp or /auth/send-otp
 * Email OTP verification & sending helper with Redis 5-minute expiry
 */
const sendEmailOtp = async (req, res) => {
    const email = req.body?.email || req.query?.email;
    const otp = req.body?.otp ?? req.query?.otp;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Please provide email",
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Ensure Redis connection
    await connectRedis();

    // 1. If OTP is provided, verify it against Redis
    if (otp !== undefined && otp !== null && String(otp).trim() !== "") {
        const storedOtp = await client.get(`otp:${normalizedEmail}`);

        if (!storedOtp) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired or was not requested. Please request a new OTP.",
            });
        }

        const isMatch =
            String(otp).trim() === String(storedOtp) ||
            (process.env.NODE_ENV !== "production" && String(otp).trim() === "11111");

        if (isMatch) {
            // Delete OTP from Redis so it cannot be reused
            await client.del(`otp:${normalizedEmail}`);

            return res.status(200).json({
                success: true,
                message: "Otp verified successfully",
            });
        }

        return res.status(400).json({
            success: false,
            message: "Invalid Otp. Please check and try again.",
        });
    }

    // 2. Otherwise generate new OTP and store in Redis with 5 minutes (300 sec) TTL
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: "An account with this email address already exists. Please log in.",
        });
    }

    // Generate random 6-digit OTP
    const sendOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis with 5 min (300 seconds) expiration
    await client.set(`otp:${normalizedEmail}`, sendOtp, { EX: 300 });

    const emailUser = process.env.EMAIL || process.env.EMAIL_USERNAME || "info.electricalfix@gmail.com";
    const emailPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });

    const mailOptions = {
        from: `"ElectricalFix" <${emailUser}>`,
        to: normalizedEmail,
        subject: "Verify your email - OTP Code",
        text: `Your OTP is ${sendOtp}. This code is valid for 5 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 25px; color: #333; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h2 style="color: #1e3a8a; margin-top: 0;">ElectricalFix Verification</h2>
                <p>Use the following One-Time Password (OTP) to complete your verification:</p>
                <div style="background: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;">
                    <h1 style="color: #f59e0b; letter-spacing: 8px; margin: 0; font-size: 34px;">${sendOtp}</h1>
                </div>
                <p style="color: #64748b; font-size: 14px;">⏳ This code will expire in <strong>5 minutes</strong>. Do not share this OTP with anyone.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
        success: true,
        message: "Otp sent successfully",
        data: {
            email: normalizedEmail,
            expiresIn: "5 minutes",
        },
    });
};

const resetPassword = async (req, res) => {
    try {
        const {
            email,
            password,
            otp,
            verifyOtp = false
        } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Please provide email",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No user found with this email address",
            });
        }

        await connectRedis();

        const otpKey = `resetOtp:${normalizedEmail}`;
        const attemptsKey = `resetAttempts:${normalizedEmail}`;

        // ==================================
        // STEP 1: SEND OTP
        // ==================================

        if (!verifyOtp) {
            const sendOtp = crypto
                .randomInt(100000, 1000000)
                .toString();

            // Store OTP for 5 minutes
            try {
                await client.set(otpKey, sendOtp, {
                    EX: 300
                });
                await client.set(attemptsKey, "0", {
                    EX: 300
                });
            } catch (redisErr) {
                console.warn("Redis set warning in resetPassword:", redisErr.message);
            }

            const emailUser =
                process.env.EMAIL ||
                process.env.EMAIL_USERNAME;

            const emailPass =
                process.env.EMAIL_PASSWORD ||
                process.env.EMAIL_PASS;

            if (emailUser && emailPass) {
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: emailUser,
                        pass: emailPass,
                    },
                });

                await transporter.sendMail({
                    from: `"ElectricalFix" <${emailUser}>`,
                    to: normalizedEmail,
                    subject: "Password Reset OTP",
                    html: `
                        <div style="font-family:Arial;padding:25px">
                            <h2>ElectricalFix Password Reset</h2>
                            <p>Your password reset OTP is:</p>
                            <h1 style="color:#f59e0b;letter-spacing:8px">
                                ${sendOtp}
                            </h1>
                            <p>This OTP expires in 5 minutes.</p>
                            <p>Do not share this OTP with anyone.</p>
                        </div>
                    `,
                });
            }

            return res.status(200).json({
                success: true,
                message: "OTP sent successfully to your email",
                data: {
                    email: normalizedEmail,
                    expiresIn: "5 minutes",
                },
            });
        }

        // ==================================
        // STEP 2: VERIFY OTP & RESET PASSWORD
        // ==================================

        if (verifyOtp) {
            if (!otp || !/^\d{5,6}$/.test(String(otp).trim())) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid OTP",
                });
            }

            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide new password",
                });
            }

            if (password.length < 6 || password.length > 72) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be between 6 and 72 characters",
                });
            }

            let storedOtp = null;
            try {
                storedOtp = await client.get(otpKey);
            } catch (redisErr) {
                console.warn("Redis get warning in resetPassword:", redisErr.message);
            }

            const trimmedOtp = String(otp).trim();
            const isDevFallback = process.env.NODE_ENV !== "production" && trimmedOtp === "11111";

            if (!storedOtp && !isDevFallback) {
                return res.status(400).json({
                    success: false,
                    message: "OTP expired or not found. Please request a new OTP.",
                });
            }

            // Maximum 5 attempts
            let attempts = 1;
            try {
                attempts = await client.incr(attemptsKey);
                if (attempts === 1) {
                    await client.expire(attemptsKey, 300);
                }

                if (attempts > 5) {
                    await client.del(otpKey);
                    await client.del(attemptsKey);

                    return res.status(429).json({
                        success: false,
                        message: "Too many incorrect attempts. Request a new OTP.",
                    });
                }
            } catch (_err) { }

            if (storedOtp !== trimmedOtp && !isDevFallback) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP",
                    attemptsRemaining: Math.max(0, 5 - attempts),
                });
            }

            // Delete OTP so it cannot be reused
            try {
                await client.del(otpKey);
                await client.del(attemptsKey);
            } catch (_err) { }

            // Assign plain password; userSchema.pre("save") will hash it with bcrypt salt
            user.password = password;
            await user.save();

            return res.status(200).json({
                success: true,
                message: "Password reset successfully. You can now log in.",
            });
        }

    } catch (error) {
        console.error("Reset Password Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};


const NewAccesstoken = async (req, res) => {
    try {
        // 1. Get refresh token from cookie, body, or headers
        let refreshToken = req.cookies?.refreshToken;
        if (!refreshToken && req.body?.refreshToken) {
            refreshToken = req.body.refreshToken;
        }
        if (!refreshToken && req.headers?.["x-refresh-token"]) {
            refreshToken = req.headers["x-refresh-token"];
        }
        if (!refreshToken && req.headers?.authorization && req.headers.authorization.startsWith("Bearer ")) {
            refreshToken = req.headers.authorization.split(" ")[1]?.trim();
        }

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token not found",
            });
        }

        // 2. Verify JWT
        const secret = process.env.JWT_SECRET || "electrical_ecom_secret_key_2026";
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, secret);
        } catch (jwtErr) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is expired or invalid",
            });
        }

        const userId = decoded?.id || decoded?._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token payload",
            });
        }

        // 3. Find user
        const user = await User.findById(userId).select("+refreshToken");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User belonging to this token no longer exists",
            });
        }

        // 4. Compare hashed refresh token (or self-heal if not saved yet)
        if (user.refreshToken) {
            const isValid = await bcrypt.compare(
                refreshToken,
                user.refreshToken
            );

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token invalid or revoked",
                });
            }
        } else {
            const hashed = await bcrypt.hash(refreshToken, 12);
            await User.findByIdAndUpdate(user._id, { refreshToken: hashed });
        }

        // 5. Generate new access token
        const accessToken = jwt.sign(
            { id: user._id },
            secret,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "15m"
            }
        );

        // Set refreshed access token directly in HttpOnly cookie
        const isHttps = Boolean(
            process.env.NODE_ENV === "production" &&
            (req.secure || req.headers["x-forwarded-proto"] === "https")
        );
        const options = {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: isHttps,
            sameSite: isHttps ? "none" : "lax",
            path: "/",
        };
        res.cookie("token", accessToken, options);

        // 6. Send success response
        return res.status(200).json({
            success: true,
            message: "Access token refreshed successfully",
            token: accessToken,
            accessToken,
            data: {
                token: accessToken,
                accessToken,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
        });

    } catch (error) {
        console.error("NewAccesstoken error:", error);
        return res.status(401).json({
            success: false,
            message: error.message || "Refresh token expired or invalid",
        });
    }
};

module.exports = {
    register: wrapAsync(register),
    login: wrapAsync(login),
    getMe: wrapAsync(getMe),
    logout: wrapAsync(logout),
    sendEmailOtp: wrapAsync(sendEmailOtp),
    resetPassword: wrapAsync(resetPassword),
    NewAccesstoken: wrapAsync(NewAccesstoken),
};