import { Router } from "express";
import { hideReport, restoreReport } from "../controllers/admin.controller.js";
import { protect, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.patch("/reports/:id/hide", protect, requireAdmin, hideReport);

router.patch("/reports/:id/restore", protect, requireAdmin, restoreReport);

export { router };
