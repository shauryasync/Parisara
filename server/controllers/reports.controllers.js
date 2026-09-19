import Report from "../models/report.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

    res.status(201).json({
      success: true,
      message: "Report Created Successfully",
      result,
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong in creating Report.", error });
  }
};

const getReports = async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;

    const fetchedReport = await Report.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      message: fetchedReport.length > 0 ? "Fetched Report" : "No Report",
      data: fetchedReport,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id).populate("reportedBy");

    if (!report) return res.status(404).json({ message: "Not Found" });

    res.status(200).json({ message: "Fetched Your Report", data: report });
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
