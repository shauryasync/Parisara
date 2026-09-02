import { Router } from "express";
import {
  registerUser,
  loginUser,
  getProfile,
} from "../controllers/userAuth.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerUser);
router.get("/login", loginUser);
router.get("/me", protect, getProfile);

export { router };
