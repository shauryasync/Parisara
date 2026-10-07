import { Router } from "express";
import { createDrive } from "../controllers/drive.controllers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, createDrive);

export { router };
