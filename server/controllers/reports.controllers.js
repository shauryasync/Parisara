import Report from "../models/report.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import Support from "../models/support.model.js";
import Comment from "../models/comment.model.js";
import Save from "../models/save.model.js";
import { recordActivity } from "../utils/recordActivity.js";

const createReport = async (req, res) => {
  try {
    const imageLocalPaths = req.files?.map((file) => file.path) || [];

    const uploadImages = await Promise.all(imageLocalPaths.map((path) => uploadOnCloudinary(path)));

    const img_URL = uploadImages.filter((img) => img !== null).map((img) => img.secure_url);

    const { title, details, category, placename } = req.body;

    if (!title || !details || !category || !placename) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    const result = await Report.create({
      title,
      details,
      category,
      placename,
      images: img_URL,
      reportedBy: req.user._id,
    });

    await recordActivity({
      user: req.user._id,
      action: "report_created",
      report: result._id,
    });

    res.status(201).json({
      success: true,
      message: "Report Created Successfully",
      result,
    });
  } catch (error) {
    console.error("Error creating report:", error);
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({
      message: status === 400 ? "Invalid report data" : "Something went wrong in creating Report.",
      error: error.message,
    });
  }
};

const getReports = async (req, res) => {
  try {
    const { category, status, search } = req.query;
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
    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({ success: false, message: "Invalid pagination values" });
    }

    const filter = {};
    const allowedCategories = ["pollution", "waste", "deforestation", "water", "other"];
    const allowedStatuses = ["reported", "in-progress", "resolved"];
    const categories =
      category === undefined ? [] : Array.isArray(category) ? category : [category];
    const statuses = status === undefined ? [] : Array.isArray(status) ? status : [status];

    if (
      categories.some((value) => !allowedCategories.includes(value)) ||
      statuses.some((value) => !allowedStatuses.includes(value)) ||
      (search !== undefined && typeof search !== "string")
    ) {
      return res.status(400).json({ success: false, message: "Invalid report filters" });
    }

    if (categories.length) filter.category = { $in: categories };
    if (statuses.length) filter.status = { $in: statuses };

    if (search && search.trim()) {
      const query = search.trim();
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escapedQuery, $options: "i" } },
        { details: { $regex: escapedQuery, $options: "i" } },
        { placename: { $regex: escapedQuery, $options: "i" } },
        { category: { $regex: escapedQuery, $options: "i" } },
        { status: { $regex: escapedQuery, $options: "i" } },
      ];
    }

    const [fetchedReports, totalReports, myReportCount] = await Promise.all([
      Report.find(filter)
        .populate("reportedBy", "name username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
      req.user?._id ? Report.countDocuments({ reportedBy: req.user._id }) : 0,
    ]);

    const reportsWithDetails = await Promise.all(
      fetchedReports.map(async (report) => {
        const userId = req.user?._id;
        const [supportCount, commentCount, recentComments, supported, saved] = await Promise.all([
          Support.countDocuments({ report: report._id }),
          Comment.countDocuments({ report: report._id }),
          Comment.find({ report: report._id })
            .populate("user", "name username")
            .sort({ createdAt: -1 })
            .limit(2),
          userId ? Support.exists({ report: report._id, user: userId }) : null,
          userId ? Save.exists({ report: report._id, user: userId }) : null,
        ]);

        return {
          ...report.toObject(),
          supportCount,
          supportedByCurrentUser: Boolean(supported),
          savedByCurrentUser: Boolean(saved),
          commentCount,
          recentComments,
        };
      }),
    );

    return res.status(200).json({
      message: fetchedReports.length > 0 ? "Fetched Report" : "No Report",
      data: reportsWithDetails,
      myReportCount,
      pagination: {
        currentPage: page,
        limit,
        totalReports,
        totalPages: Math.ceil(totalReports / limit),
        hasMore: skip + fetchedReports.length < totalReports,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id).populate("reportedBy");

    if (!report) return res.status(404).json({ message: "Not Found" });

    const [supportCount, commentCount, supported, saved] = await Promise.all([
      Support.countDocuments({ report: report._id }),
      Comment.countDocuments({ report: report._id }),
      req.user?._id ? Support.exists({ report: report._id, user: req.user._id }) : null,
      req.user?._id ? Save.exists({ report: report._id, user: req.user._id }) : null,
    ]);

    res.status(200).json({
      message: "Fetched Your Report",
      data: {
        ...report.toObject(),
        supportCount,
        commentCount,
        supportedByCurrentUser: Boolean(supported),
        savedByCurrentUser: Boolean(saved),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const updateReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      console.log(report);
      return res.status(404).json({ message: "Not Found" });
    }

    const { title, details, placename, category } = req.body;

    if (report.reportedBy?.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized to edit" });

    if (title) report.title = title;
    if (details) report.details = details;
    if (placename) report.placename = placename;
    if (category) report.category = category;

    if (req.files?.length) {
      const uploaded = await Promise.all(req.files.map((f) => uploadOnCloudinary(f.path)));
      const newUrls = uploaded.filter(Boolean).map((img) => img.secure_url);
      report.images.push(...newUrls);
    }

    await report.save();
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong updating the report" });
  }
};

const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) return res.status(404).json({ message: "Report Not Found" });

    if (report.reportedBy?.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not Permitted to Delete" });

    await Report.deleteOne(report);

    return res.status(200).json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Internal Sever Error...Cannot Delete thr report.",
    });
  }
};

export { createReport, getReports, getReportById, updateReport, deleteReport };
