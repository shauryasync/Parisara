import { Router } from "express";
import {
  createReport,
  deleteReport,
  deleteReportImage,
  getReportById,
  getReports,
  getTrendingZones,
  replaceReportImage,
  updateReport,
} from "../controllers/reports.controllers.js";
import { optionalAuth, protect } from "../middleware/auth.middleware.js";
import {
  uploadReportImages,
  uploadSingleReportImage,
} from "../middleware/cloudinary.middleware.js";

const router = Router();

router.post("/create-report", protect, uploadReportImages, createReport);
router.get("/trending-zones", getTrendingZones);
router.get("/get-reports", optionalAuth, getReports);
router.get("/get-reports/:id", optionalAuth, getReportById);
router.patch(
  "/get-reports/:id/images/:imageIndex",
  protect,
  uploadSingleReportImage,
  replaceReportImage,
);
router.delete("/get-reports/:id/images/:imageIndex", protect, deleteReportImage);
router.patch("/get-reports/:id", protect, uploadReportImages, updateReport);
router.delete("/get-reports/:id", protect, deleteReport);
export { router };
