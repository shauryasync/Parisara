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

const MAX_REPORTS_SKIP = 100_000;

const parsePositiveInteger = (value) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const getAdminReports = async (req, res) => {
  try {
    const { visibility, category, status, search } = req.query;
    const page = parsePositiveInteger(req.query.page ?? "1");
    const requestedLimit = parsePositiveInteger(req.query.limit ?? "10");
    const limit = requestedLimit !== null && requestedLimit <= 50 ? requestedLimit : null;
    const categories = Report.schema.path("category").enumValues;
    const statuses = Report.schema.path("status").enumValues;

    if (
      page === null ||
      limit === null ||
      (visibility !== undefined && !["all", "visible", "hidden"].includes(visibility)) ||
      (category !== undefined &&
        (typeof category !== "string" || !categories.includes(category))) ||
      (status !== undefined && (typeof status !== "string" || !statuses.includes(status))) ||
      (search !== undefined && typeof search !== "string")
    ) {
      return res.status(400).json({ success: false, message: "Invalid report filters" });
    }

    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(skip) || skip > MAX_REPORTS_SKIP) {
      return res.status(400).json({ success: false, message: "Invalid pagination values" });
    }

    const filter = {};
    if (visibility === "visible") filter.isHidden = { $ne: true };
    if (visibility === "hidden") filter.isHidden = true;
    if (category !== undefined) filter.category = category;
    if (status !== undefined) filter.status = status;
    if (search?.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { details: { $regex: escapedSearch, $options: "i" } },
        { placename: { $regex: escapedSearch, $options: "i" } },
        { category: { $regex: escapedSearch, $options: "i" } },
        { status: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("reportedBy", "name username")
        .populate("moderatedBy", "name username")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + reports.length < total,
      },
    });
  } catch (error) {
    console.error("Error loading admin reports:", error);
    return res.status(500).json({ success: false, message: "Unable to load reports" });
  }
};

const updateAdminReportStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    const statuses = Report.schema.path("status").enumValues;

    if (typeof status !== "string" || !statuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid report status" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    report.status = status;
    await report.save();
    await report.populate("reportedBy", "name username");

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error updating admin report status:", error);
    return res.status(500).json({ success: false, message: "Unable to update report status" });
  }
};

export { hideReport, restoreReport, getAdminReports, updateAdminReportStatus };
