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

export { createReport };
