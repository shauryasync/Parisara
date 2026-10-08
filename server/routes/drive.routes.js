import { Router } from "express";
import {
  createDrive,
  getDrives,
  getDriveById,
  joinDrive,
  leaveDrive,
  getDriveParticipants,
} from "../controllers/drive.controllers.js";
import { optionalAuth, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, createDrive);
router.get("/", optionalAuth, getDrives);
router.get("/:id", optionalAuth, getDriveById);
router.post("/:id/join", protect, joinDrive);
router.delete("/:id/join", protect, leaveDrive);
router.get("/:id/participants", optionalAuth, getDriveParticipants);

export { router };
