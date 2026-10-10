import { Router } from "express";
import {
  registerUser,
  verifyEmail,
  loginUser,
  getProfile,
} from "../controllers/userAuth.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email", verifyEmail);
router.get("/me", protect, getProfile);

export { router };
