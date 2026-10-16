import Report from "../models/report.model.js";
import Save from "../models/save.model.js";
import Support from "../models/support.model.js";
import Comment from "../models/comment.model.js";
import Drive from "../models/drive.model.js";
import { recordActivity } from "../utils/recordActivity.js";

const createNewSave = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "The Report Does not Exists",
      });
    }

    const existingSave = await Save.exists({
      user: userId,
      report: id,
    });

    if (existingSave) {
      return res.status(409).json({
        success: false,
        message: "You have already saved this report",
      });
    }
    const newSave = await Save.create({
      user: userId,
      report: id,
    });

    await recordActivity({
      user: userId,
      action: "report_saved",
      report: id,
    });

    const count = await Save.countDocuments({
      report: id,
    });

    const isSaved = await Save.exists({
      user: userId,
      report: id,
    });

    return res.status(201).json({
      success: true,
      message: "Saved Successfully",
      data: {
        savedByCurrentUser: Boolean(isSaved),
      },
    });
  } catch (error) {
    const isDuplicateSave =
      error?.code === 11000 ||
      error?.code === "11000" ||
      (error?.name === "MongoServerError" && /duplicate key/i.test(error?.message ?? ""));

    if (isDuplicateSave) {
      return res.status(409).json({
        success: false,
        message: "You have already saved this report",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getSave = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "The Report Does not Exists",
      });
    }

    const count = await Save.countDocuments({
      report: id,
    });

    const isSaved = await Save.exists({
      user: userId,
      report: id,
    });

    return res.status(200).json({
      success: true,
      data: {
        savedByCurrentUser: Boolean(isSaved),
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

const deleteSave = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const deletedSave = await Save.findOneAndDelete({
      user: userId,
      report: id,
    });

    if (!deletedSave) {
      return res.status(404).json({
        success: false,
        message: "You have not saved this report",
      });
    }

    const count = await Save.countDocuments({
      report: id,
    });

    return res.status(200).json({
      success: true,
      message: "Save removed successfully",
      data: {
        count,
        savedByCurrentUser: false,
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

const getSavedReports = async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const requestedLimit = Number(req.query.limit ?? 10);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(requestedLimit) ||
      requestedLimit < 1
    ) {
      return res.status(400).json({ success: false, message: "Invalid pagination values" });
    }

    const limit = Math.min(requestedLimit, 50);
    const savedEntries = await Save.find({ user: req.user._id })
      .select("report")
      .sort({ createdAt: -1 })
      .lean();
    const visibleReports = await Report.find({
      _id: { $in: savedEntries.map((entry) => entry.report) },
      isHidden: { $ne: true },
    })
      .select("_id")
      .lean();
    const visibleReportIds = new Set(visibleReports.map((report) => report._id.toString()));
    const visibleSaves = savedEntries.filter((entry) =>
      visibleReportIds.has(entry.report.toString()),
    );
    const pageSaves = visibleSaves.slice((page - 1) * limit, page * limit);
    const fetchedReports = await Report.find({
      _id: { $in: pageSaves.map((entry) => entry.report) },
    })
      .populate("reportedBy", "name username")
      .lean();
    const reportById = new Map(fetchedReports.map((report) => [report._id.toString(), report]));

    const availableSaves = pageSaves.filter((entry) => reportById.has(entry.report.toString()));
    const reportsWithDetails = await Promise.all(
      availableSaves.map(async (entry) => {
        const report = reportById.get(entry.report.toString());
        const [supportCount, commentCount, recentComments, supported] = await Promise.all([
          Support.countDocuments({ report: entry.report }),
          Comment.countDocuments({ report: entry.report }),
          Comment.find({ report: entry.report })
            .populate("user", "name username")
            .sort({ createdAt: -1 })
            .limit(2)
            .lean(),
          Support.exists({ report: entry.report, user: req.user._id }),
        ]);

        return {
          ...report,
          supportCount,
          commentCount,
          recentComments,
          savedByCurrentUser: true,
          supportedByCurrentUser: Boolean(supported),
        };
      }),
    );
    const linkedDrives = await Drive.find({
      report: { $in: pageSaves.map((entry) => entry.report) },
    })
      .select("title startsAt meetingPoint status report")
      .sort({ startsAt: 1 })
      .lean();
    const drivesByReport = new Map();
    linkedDrives.forEach((drive) => {
      const reportId = drive.report.toString();
      const reportDrives = drivesByReport.get(reportId) || [];
      reportDrives.push(drive);
      drivesByReport.set(reportId, reportDrives);
    });

    reportsWithDetails.forEach((report) => {
      report.linkedDrives = drivesByReport.get(report._id.toString()) || [];
    });

    return res.status(200).json({
      success: true,
      data: reportsWithDetails,
      pagination: {
        page,
        limit,
        total: visibleSaves.length,
        pages: Math.ceil(visibleSaves.length / limit),
        hasMore: page * limit < visibleSaves.length,
      },
    });
  } catch (error) {
    console.error("Error loading saved reports:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load saved reports",
    });
  }
};

export { createNewSave, getSave, deleteSave, getSavedReports };
