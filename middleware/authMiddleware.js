const jwt = require("jsonwebtoken");
const User = require("../model/User/UserModal");
const wrapAsync = require("../utils/wrapAsync");

/**
 * Helper to extract token from request (Authorization header, cookies, or x-auth-token)
 */
const extractToken = (req) => {
  let token = null;
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader && typeof authHeader === "string") {
    const trimmed = authHeader.trim();
    if (trimmed.toLowerCase().startsWith("bearer ")) {
      token = trimmed.slice(7).trim();
    } else if (!trimmed.includes(" ")) {
      token = trimmed;
    }
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token && req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) {
      try {
        token = decodeURIComponent(match[1]).replace(/^"|"$/g, "");
      } catch {
        token = match[1].replace(/^"|"$/g, "");
      }
    }
  }

  if (!token && req.headers["x-auth-token"]) {
    token = req.headers["x-auth-token"];
  }

  return token;
};

/**
 * Protect middleware: Requires valid JWT token in Authorization header, cookie, or x-auth-token.
 * Verifies token, fetches user from database, and attaches req.user and req.userId.
 */
const protect = wrapAsync(async (req, res, next) => {
  try {
    const token = extractToken(req);

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
});

/**
 * Optional Auth middleware: If token is provided and valid, attaches user to req.
 * If no token is provided or invalid, continues without error (for public endpoints with optional user context).
 */
const optionalAuth = wrapAsync(async (req, res, next) => {
  try {
    const token = extractToken(req);

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
});

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

