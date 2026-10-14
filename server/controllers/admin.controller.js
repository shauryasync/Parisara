import Report from "../models/report.model.js";

const hideReport = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = req.body?.reason;

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A moderation reason is required",
      });
    }

    if (reason.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: "Reason cannot exceed 500 characters",
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (report.isHidden) {
      return res.status(409).json({
        success: false,
        message: "Report is already hidden",
      });
    }

    report.isHidden = true;
    report.moderationReason = reason.trim();
    report.moderatedBy = req.user._id;
    report.moderatedAt = new Date();

    await report.save();

    return res.status(200).json({
      success: true,
      message: "Report hidden successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error hiding report:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to hide report",
    });
  }
};

const restoreReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (!report.isHidden) {
      return res.status(409).json({
        success: false,
        message: "Report is not hidden",
      });
    }

    report.isHidden = false;
    report.moderationReason = null;
    report.moderatedBy = null;
    report.moderatedAt = null;

    await report.save();

    return res.status(200).json({
      success: true,
      message: "Report restored successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error restoring report:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to restore report",
    });
  }
};

export { hideReport, restoreReport };
