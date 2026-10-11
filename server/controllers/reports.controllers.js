import Report from "../models/report.model.js";
import { unlink } from "fs/promises";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import Support from "../models/support.model.js";
import Comment from "../models/comment.model.js";
import Save from "../models/save.model.js";
import { recordActivity } from "../utils/recordActivity.js";

const removeTemporaryUpload = async (file) => {
  if (!file?.path) return;
  try {
    await unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Unable to remove temporary report image:", error);
    }
  }
};

const parseGeoPoint = (value) => {
  if (value === undefined || value === "") return undefined;
  let geo;
  try {
    geo = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }

  const coordinates = geo?.coordinates;
  if (
    geo?.type !== "Point" ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !coordinates.every(Number.isFinite) ||
    coordinates[0] < -180 ||
    coordinates[0] > 180 ||
    coordinates[1] < -90 ||
    coordinates[1] > 90
  ) {
    return null;
  }

  return { type: "Point", coordinates };
};

const createReport = async (req, res) => {
  try {
    const { title, details, category, placename } = req.body;

    if (!title || !details || !category || !placename) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    const geo = parseGeoPoint(req.body.geo);
    if (req.body.geo && !geo) {
      return res.status(400).json({ success: false, message: "Invalid location coordinates" });
    }

    const imageLocalPaths = req.files?.map((file) => file.path) || [];
    const uploadImages = await Promise.all(imageLocalPaths.map((path) => uploadOnCloudinary(path)));
    const img_URL = uploadImages.map((img) => img.secure_url);
    const imagePublicIds = uploadImages.map((img) => img.public_id);

    const result = await Report.create({
      title,
      details,
      category,
      placename,
      ...(geo ? { geo } : {}),
      images: img_URL,
      imagePublicIds,
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
      await Promise.all((req.files || []).map(removeTemporaryUpload));
      return res.status(404).json({ message: "Not Found" });
    }

    const { title, details, placename, category } = req.body;

    if (report.reportedBy?.toString() !== req.user._id.toString()) {
      await Promise.all((req.files || []).map(removeTemporaryUpload));
      return res.status(403).json({ message: "Not authorized to edit" });
    }

    if (title) report.title = title;
    if (details) report.details = details;
    if (placename) report.placename = placename;
    if (category) report.category = category;
    if (req.body.geo !== undefined) {
      const geo = parseGeoPoint(req.body.geo);
      if (req.body.geo && !geo) {
        await Promise.all((req.files || []).map(removeTemporaryUpload));
        return res.status(400).json({ success: false, message: "Invalid location coordinates" });
      }
      report.geo = geo || { type: "Point", coordinates: [] };
    }

    if (req.files?.length) {
      const uploaded = await Promise.all(req.files.map((f) => uploadOnCloudinary(f.path)));
      const newUrls = uploaded.map((img) => img.secure_url);
      if (report.images.length + newUrls.length > 5) {
        await Promise.all(
          uploaded.map(async (image) => {
            try {
              await deleteImageFromCloudinary(image.secure_url, image.public_id);
            } catch (error) {
              console.error("Unable to clean up excess report image:", error);
            }
          }),
        );
        return res.status(400).json({ message: "A report can have up to five images." });
      }
      report.images.push(...newUrls);
      report.imagePublicIds = Array.from(
        { length: report.images.length - newUrls.length },
        (_, index) => report.imagePublicIds?.[index] || "",
      );
      report.imagePublicIds.push(...uploaded.map((img) => img.public_id));
    }

    await report.save();
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong updating the report" });
  }
};

const replaceReportImage = async (req, res) => {
  let uploadedImage;
  try {
    const { id, imageIndex: rawImageIndex } = req.params;
    const imageIndex = Number(rawImageIndex);
    if (!Number.isSafeInteger(imageIndex) || imageIndex < 0) {
      await removeTemporaryUpload(req.file);
      return res.status(400).json({ success: false, message: "Invalid image index" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Select an image to replace it" });
    }

    const report = await Report.findById(id);
    if (!report) {
      await removeTemporaryUpload(req.file);
      return res.status(404).json({ success: false, message: "Report Not Found" });
    }
    if (report.reportedBy?.toString() !== req.user._id.toString()) {
      await removeTemporaryUpload(req.file);
      return res.status(403).json({ success: false, message: "Not authorized to edit this report" });
    }
    if (imageIndex >= report.images.length) {
      await removeTemporaryUpload(req.file);
      return res.status(404).json({ success: false, message: "Image Not Found" });
    }

    uploadedImage = await uploadOnCloudinary(req.file.path);
    const previousImage = report.images[imageIndex];
    const previousPublicId = report.imagePublicIds?.[imageIndex];
    report.images[imageIndex] = uploadedImage.secure_url;
    report.imagePublicIds = Array.from(
      { length: report.images.length },
      (_, index) => (index === imageIndex ? uploadedImage.public_id : report.imagePublicIds?.[index] || ""),
    );

    try {
      await report.save();
    } catch (error) {
      try {
        await deleteImageFromCloudinary(uploadedImage.secure_url, uploadedImage.public_id);
      } catch (cleanupError) {
        console.error("Unable to clean up replaced report image:", cleanupError);
      }
      throw error;
    }

    let cleanupWarning;
    try {
      await deleteImageFromCloudinary(previousImage, previousPublicId);
    } catch (error) {
      console.error("Unable to clean up previous report image:", error);
      cleanupWarning = "The new image was saved, but the old image could not be removed from storage.";
    }

    return res.status(200).json({
      success: true,
      message: "Report image replaced",
      data: report,
      ...(cleanupWarning ? { cleanupWarning } : {}),
    });
  } catch (error) {
    if (!uploadedImage) await removeTemporaryUpload(req.file);
    console.error("Error replacing report image:", error);
    return res.status(500).json({ success: false, message: "Unable to replace report image" });
  }
};

const deleteReportImage = async (req, res) => {
  try {
    const { id, imageIndex: rawImageIndex } = req.params;
    const imageIndex = Number(rawImageIndex);
    if (!Number.isSafeInteger(imageIndex) || imageIndex < 0) {
      return res.status(400).json({ success: false, message: "Invalid image index" });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ success: false, message: "Report Not Found" });
    if (report.reportedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this report" });
    }
    if (imageIndex >= report.images.length) {
      return res.status(404).json({ success: false, message: "Image Not Found" });
    }

    const [removedImage] = report.images.splice(imageIndex, 1);
    const imagePublicIds = Array.from(
      { length: report.images.length + 1 },
      (_, index) => report.imagePublicIds?.[index] || "",
    );
    const [removedPublicId] = imagePublicIds.splice(imageIndex, 1);
    report.imagePublicIds = imagePublicIds;
    await report.save();

    let cleanupWarning;
    try {
      await deleteImageFromCloudinary(removedImage, removedPublicId);
    } catch (error) {
      console.error("Unable to clean up deleted report image:", error);
      cleanupWarning = "The image was removed from the report, but could not be removed from storage.";
    }

    return res.status(200).json({
      success: true,
      message: "Report image deleted",
      data: report,
      ...(cleanupWarning ? { cleanupWarning } : {}),
    });
  } catch (error) {
    console.error("Error deleting report image:", error);
    return res.status(500).json({ success: false, message: "Unable to delete report image" });
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

export {
  createReport,
  getReports,
  getReportById,
  updateReport,
  replaceReportImage,
  deleteReportImage,
  deleteReport,
};
