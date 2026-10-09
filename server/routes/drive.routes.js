import { Router } from "express";
import {
  createDrive,
  getDrives,
  getDriveById,
  joinDrive,
  leaveDrive,
  getDriveParticipants,
  editDrive,
  addCoOrganizer,
  removeCoOrganizer,
  cancelDrive,
  completeDrive,
  getDriveComments,
  createDriveComment,
  deleteDriveComment,
} from "../controllers/drive.controllers.js";
import { optionalAuth, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, createDrive);
router.get("/", optionalAuth, getDrives);
router.get("/:id", optionalAuth, getDriveById);
router.patch("/:id", protect, editDrive);
router.patch("/:id/cancel", protect, cancelDrive);
router.patch("/:id/complete", protect, completeDrive);
router.post("/:id/join", protect, joinDrive);
router.delete("/:id/join", protect, leaveDrive);
router.get("/:id/participants", optionalAuth, getDriveParticipants);
router.post("/:id/co-organizers", protect, addCoOrganizer);
router.delete("/:id/co-organizers/:userId", protect, removeCoOrganizer);
router.get("/:id/comments", optionalAuth, getDriveComments);
router.post("/:id/comments", protect, createDriveComment);
router.delete("/comments/:commentId", protect, deleteDriveComment);

export { router };
