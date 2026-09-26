import { Router } from "express";
import { deleteSupport, getSupport, createNewSupport } from "../controllers/support.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/:id/support", protect, createNewSupport);
router.get("/:id/support", protect, getSupport);
router.delete("/:id/support", protect, deleteSupport);

export { router };
