import { Router } from "express";
import {
  registerUser,
  verifyEmail,
  loginUser,
  getProfile,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email", verifyEmail);
router.get("/me", protect, getProfile);

export { router };
