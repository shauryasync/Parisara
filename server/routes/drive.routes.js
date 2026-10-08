import { Router } from "express";
import { createDrive, getDrives, getDriveById } from "../controllers/drive.controllers.js";
import { optionalAuth, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, createDrive);
router.get("/", optionalAuth, getDrives);
router.get("/:id", optionalAuth, getDriveById);

export { router };
