import { Router } from "express";
import {
  createNewSave,
  getSave,
  deleteSave,
  getSavedReports,
} from "../controllers/save.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/saved", protect, getSavedReports);
router.post("/:id/save", protect, createNewSave);
router.get("/:id/save", protect, getSave);
router.delete("/:id/save", protect, deleteSave);

export { router };
