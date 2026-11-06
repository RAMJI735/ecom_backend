const jwt = require("jsonwebtoken");
const User = require("../model/User/UserModal");

/**
 * Protect middleware: Requires valid JWT token in Authorization header, cookie, or x-auth-token.
 * Verifies token, fetches user from database, and attaches req.user and req.userId.
 */
const protect = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    } else if (req.headers["x-auth-token"]) {
      token = req.headers["x-auth-token"];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in to continue.",
      });
    }

    const secret = process.env.JWT_SECRET || "electrical_ecom_secret_key_2026";
    const decoded = jwt.verify(token, secret);

    const userId = decoded.id || decoded._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User belonging to this token no longer exists.",
      });
    }

    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token. Please log in again.",
    });
  }
};

/**
 * Optional Auth middleware: If token is provided and valid, attaches user to req.
 * If no token is provided, continues without error (for public endpoints with user context).
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    } else if (req.headers["x-auth-token"]) {
      token = req.headers["x-auth-token"];
    }

    if (token) {
      const secret = process.env.JWT_SECRET || "electrical_ecom_secret_key_2026";
      const decoded = jwt.verify(token, secret);
      const userId = decoded.id || decoded._id;

      if (userId) {
        const user = await User.findById(userId).select("-password");
        if (user) {
          req.user = user;
          req.userId = user._id.toString();
        }
      }
    }
  } catch (_) {
    // Continue without setting user if token is invalid or expired
  }
  next();
};

/**
 * Authorize roles middleware: Restricts route access to specified roles (e.g. 'admin').
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user?.role || "guest"}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};

const adminOnly = authorizeRoles("admin");

module.exports = {
  protect,
  isAuthenticatedUser: protect,
  authMiddleware: protect,
  optionalAuth,
  authorizeRoles,
  adminOnly,
};

