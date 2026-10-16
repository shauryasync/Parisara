import { Router } from "express";
import {
  registerUser,
  verifyEmail,
  loginUser,
  getProfile,
  updateAvatar,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { uploadAvatar } from "../middleware/cloudinary.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email", verifyEmail);
router.get("/me", protect, getProfile);
router.patch("/me/avatar", protect, uploadAvatar, updateAvatar);

export { router };
