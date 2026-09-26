import Router from "express";
import { createNewComment, getComment, deleteComment } from "../controllers/comment.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/:id/comments", protect, createNewComment);
router.get("/:id/comments", protect, getComment);
router.delete("/comments/:commentId", protect, deleteComment);

export { router };
