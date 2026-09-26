import { Router } from "express";
import { createNewSave, getSave, deleteSave } from "../controllers/save.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/:id/save", protect, createNewSave);
router.get("/:id/save", protect, getSave);
router.delete("/:id/save", protect, deleteSave);

export { router };
