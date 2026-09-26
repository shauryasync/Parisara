import Comment from "../models/comment.model.js";
import Report from "../models/report.model.js";

const createNewComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { content } = req.body;

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        message: "The Report does not Exist",
      });
    }

    const newComment = await Comment.create({
      user: userId,
      report: id,
      content: content.trim(),
    });

    const count = await Comment.countDocuments({
      report: id,
    });

    return res.status(201).json({
      success: true,
      message: "Comment added Successfully",
      data: {
        comment: newComment,
        count,
        commentedByCurrentUser: true,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        message: "The Report Does Not Exists",
      });
    }

    const comments = await Comment.find({ report: id })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const count = comments.length;

    const isCommented = await Comment.exists({
      user: userId,
      report: id,
    });

    return res.status(200).json({
      success: true,
      data: {
        comments,
        count,
        commentedByCurrentUser: Boolean(isCommented),
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const deleteComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { commentId } = req.params;

    const deletedComment = await Comment.findOneAndDelete({
      _id: commentId,
      user: userId,
    });

    if (!deletedComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you do not own it",
      });
    }

    const count = await Comment.countDocuments({
      report: deletedComment.report,
    });

    return res.status(200).json({
      success: true,
      message: "Comment removed successfully",
      data: {
        count,
        commentedByCurrentUser: false,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export { createNewComment, getComment, deleteComment };
