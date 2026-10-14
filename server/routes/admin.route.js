import { Router } from "express";
import {
  hideReport,
  restoreReport,
  getAdminReports,
  updateAdminReportStatus,
  getAdminUsers,
  updateAdminUserRole,
} from "../controllers/admin.controller.js";
import { protect, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.patch("/reports/:id/hide", protect, requireAdmin, hideReport);

router.patch("/reports/:id/restore", protect, requireAdmin, restoreReport);

router.get("/reports", protect, requireAdmin, getAdminReports);
router.patch("/reports/:id/status", protect, requireAdmin, updateAdminReportStatus);
router.get("/users", protect, requireAdmin, getAdminUsers);
router.patch("/users/:id/role", protect, requireAdmin, updateAdminUserRole);

export { router };
