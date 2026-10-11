import fs from "fs";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    console.error("Cloudinary upload error:", error.message);
    throw error;
  }
};

const getPublicIdFromImageUrl = (imageUrl) => {
  let image;
  try {
    image = new URL(imageUrl);
  } catch {
    return null;
  }

  if (!image.hostname.endsWith(".cloudinary.com")) return null;

  const pathParts = image.pathname.split("/").filter(Boolean);
  const uploadIndex = pathParts.indexOf("upload");
  if (uploadIndex === -1) return null;

  const afterUpload = pathParts.slice(uploadIndex + 1);
  const versionIndex = afterUpload.findIndex((part) => /^v\d+$/.test(part));
  const publicIdParts = afterUpload.slice(versionIndex === -1 ? 0 : versionIndex + 1);
  if (!publicIdParts.length) return null;

  const lastPart = publicIdParts[publicIdParts.length - 1];
  publicIdParts[publicIdParts.length - 1] = lastPart.replace(/\.[^.]+$/, "");
  return publicIdParts.join("/");
};

const deleteImageFromCloudinary = async (imageUrl, publicId) => {
  const imagePublicId = publicId || getPublicIdFromImageUrl(imageUrl);
  if (!imagePublicId) return;

  const result = await cloudinary.uploader.destroy(imagePublicId, { resource_type: "image" });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary could not delete the image: ${result.result}`);
  }
};

export { uploadOnCloudinary, deleteImageFromCloudinary };
