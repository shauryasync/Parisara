import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

const protect = async (req, res, next) => {
  const authHead = req.headers.authorization;

  if (!authHead?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  const token = authHead.slice(7);

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }

  if (!decoded._id) {
    return res.status(401).json({
      message: "Invalid token payload",
    });
  }

  try {
    const user = await User.findById(decoded._id).select(
      "_id name username email role isVerified createdAt avatar avatarPublicId",
    );

    if (!user) {
      return res.status(401).json({
        message: "User account no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Authentication service error",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};

const optionalAuth = async (req, res, next) => {
  const authHead = req.headers.authorization;

  if (!authHead?.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(authHead.slice(7), process.env.JWT_SECRET);

    if (!decoded._id) {
      req.user = null;
      return next();
    }

    req.user = await User.findById(decoded._id).select(
      "_id name username email role isVerified createdAt avatar avatarPublicId",
    );
  } catch {
    req.user = null;
  }

  next();
};

export { optionalAuth, protect, requireAdmin };
