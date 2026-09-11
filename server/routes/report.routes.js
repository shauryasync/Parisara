import { Router } from "express";
import { createReport } from "../controllers/reports.controllers.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/cloudinary.middleware.js";

const router = Router();

router.post("/create-report", protect, upload.array("images", 5), createReport);

export { router };
