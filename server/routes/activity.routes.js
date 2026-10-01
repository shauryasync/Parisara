import { Router } from "express";
import { getActivities } from "../controllers/activity.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", protect, getActivities);

export { router };
