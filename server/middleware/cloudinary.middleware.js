import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { randomUUID } from "node:crypto";

const tempDir = path.resolve(process.cwd(), "public", "temp");

fs.mkdirSync(tempDir, { recursive: true });

const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const extension = allowedImageTypes.get(file.mimetype);

    if (!extension) {
      return cb(new Error("Unsupported image type"));
    }

    cb(null, `${randomUUID()}${extension}`);
  },
});

const imageFileFilter = (_req, file, cb) => {
  if (!allowedImageTypes.has(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
    fields: 20,
    parts: 26,
  },
  fileFilter: imageFileFilter,
});

export const uploadReportImages = (req, res, next) => {
  upload.array("images", 5)(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Each image must be 5 MB or smaller."
          : error.code === "LIMIT_FILE_COUNT"
            ? "You can upload up to 5 images."
            : "Invalid image upload.";

      return res.status(400).json({ success: false, message });
    }

    if (
      error.message === "Only JPEG, PNG, and WebP images are allowed" ||
      error.message === "Unsupported image type"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return next(error);
  });
};

export const uploadSingleReportImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Each image must be 5 MB or smaller."
          : "Invalid image upload.";

      return res.status(400).json({ success: false, message });
    }

    if (
      error.message === "Only JPEG, PNG, and WebP images are allowed" ||
      error.message === "Unsupported image type"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return next(error);
  });
};

const avatarUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 20,
    parts: 21,
  },
  fileFilter: imageFileFilter,
});

export const uploadAvatar = (req, res, next) => {
  avatarUpload.single("avatar")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Profile photos must be 5 MB or smaller."
          : error.code === "LIMIT_UNEXPECTED_FILE"
            ? "Choose a JPEG, PNG, or WebP image for your profile photo."
            : "Invalid profile photo upload.";

      return res.status(400).json({ success: false, message });
    }

    if (error.message === "Only JPEG, PNG, and WebP images are allowed") {
      return res.status(400).json({ success: false, message: error.message });
    }

    return next(error);
  });
};
