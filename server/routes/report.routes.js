import { Router } from "express";
import {
  createReport,
  deleteReport,
  getReportById,
  getReports,
  updateReport,
} from "../controllers/reports.controllers.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/cloudinary.middleware.js";

const router = Router();

router.post("/create-report", protect, upload.array("images", 5), createReport);
router.get("/get-reports", getReports);
router.get("/get-reports/:id", getReportById);
router.patch("/get-reports/:id", protect, upload.array("images", 5), updateReport);
router.delete("/get-reports/:id", protect, deleteReport);
export { router };
