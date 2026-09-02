import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

const protect = async (req, res, next) => {
  const authHead = req.headers.authorization;
  if (!authHead || !authHead.startsWith("Bearer ")) {
    return res.status("401").json({
      message: "No token provided",
    });
  }

  const token = authHead.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid Token",
    });
  }
  try {
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
};

export { protect };
