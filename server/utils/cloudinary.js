import { open, unlink } from "node:fs/promises";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const removeTemporaryFile = async (filePath) => {
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Unable to remove temporary upload:", error.message);
    }
  }
};

const isValidImageFile = async (filePath) => {
  let fileHandle;
  try {
    fileHandle = await open(filePath, "r");
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await fileHandle.read(buffer, 0, 12, 0);
    if (bytesRead < 4) return false;

    // JPEG: 0xFF 0xD8 0xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (
      bytesRead >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return true;
    }

    // WebP: 'RIFF' (0..3) and 'WEBP' (8..11)
    if (
      bytesRead >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  } finally {
    if (fileHandle) {
      await fileHandle.close().catch(() => {});
    }
  }
};

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    const isValid = await isValidImageFile(localFilePath);
    if (!isValid) {
      const error = new Error(
        "Invalid image content: file signature does not match supported image types.",
      );
      error.statusCode = 400;
      throw error;
    }

    return await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    throw error;
  } finally {
    await removeTemporaryFile(localFilePath);
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

export { uploadOnCloudinary, deleteImageFromCloudinary, removeTemporaryFile, isValidImageFile };
