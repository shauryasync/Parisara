import mongoose from "mongoose";
import Drive from "../models/drive.model.js";
import Report from "../models/report.model.js";
import Support from "../models/support.model.js";
import User from "../models/user.models.js";

const DRIVE_TYPES = [
  "cleanup",
  "tree-planting",
  "waste-collection",
  "awareness",
  "restoration",
  "other",
];
const createDrive = async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Request body must be a JSON object",
    });
  }

  const {
    title,
    type,
    description,
    report = null,
    coOrganizers = [],
    startsAt,
    endsAt,
    issueLocation,
    meetingPoint,
    maxParticipants,
    organizerNote,
    requiredMaterials = [],
    contactInformation,
  } = req.body;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof type !== "string" ||
    !DRIVE_TYPES.includes(type) ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof meetingPoint !== "string" ||
    !meetingPoint.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Title, valid Drive type, description, and meeting point are required",
    });
  }

  if (
    typeof startsAt !== "string" ||
    !startsAt.trim() ||
    typeof endsAt !== "string" ||
    !endsAt.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid start and end dates are required",
    });
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({
      success: false,
      message: "End date must be valid and after the start date",
    });
  }

  if (report !== null && (typeof report !== "string" || !mongoose.isValidObjectId(report))) {
    return res.status(400).json({
      success: false,
      message: "Report must be null or a valid Report ID",
    });
  }

  if (!Array.isArray(coOrganizers) || coOrganizers.length > 2) {
    return res.status(400).json({
      success: false,
      message: "Co-organizers must be an array with no more than two users",
    });
  }

  if (coOrganizers.some((id) => typeof id !== "string" || !mongoose.isValidObjectId(id))) {
    return res.status(400).json({
      success: false,
      message: "Each co-organizer must be a valid user ID",
    });
  }

  const normalizedCoOrganizers = coOrganizers.map((id) => id.toLowerCase());
  if (new Set(normalizedCoOrganizers).size !== normalizedCoOrganizers.length) {
    return res.status(400).json({
      success: false,
      message: "Co-organizers cannot contain duplicates",
    });
  }

  if (normalizedCoOrganizers.includes(String(req.user._id).toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: "The organizer cannot also be a co-organizer",
    });
  }

  if (
    maxParticipants !== undefined &&
    maxParticipants !== null &&
    (!Number.isInteger(maxParticipants) || maxParticipants < 1)
  ) {
    return res.status(400).json({
      success: false,
      message: "Maximum participants must be a positive whole number",
    });
  }

  if (
    !Array.isArray(requiredMaterials) ||
    requiredMaterials.some((material) => typeof material !== "string" || !material.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "Required materials must be an array of non-empty strings",
    });
  }

  for (const [field, value] of Object.entries({
    issueLocation,
    organizerNote,
    contactInformation,
  })) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      return res.status(400).json({
        success: false,
        message: `${field} must be a string`,
      });
    }
  }

  try {
    if (normalizedCoOrganizers.length > 0) {
      const existingCoOrganizerCount = await User.countDocuments({
        _id: { $in: normalizedCoOrganizers },
      });
      if (existingCoOrganizerCount !== normalizedCoOrganizers.length) {
        return res.status(404).json({
          success: false,
          message: "One or more co-organizers were not found",
        });
      }
    }

    if (report !== null) {
      const existingReport = await Report.findById(report);
      if (!existingReport) {
        return res.status(404).json({
          success: false,
          message: "Report not found",
        });
      }

      const supportCount = await Support.countDocuments({ report: existingReport._id });
      if (supportCount < 5) {
        return res.status(400).json({
          success: false,
          message: "A Report-linked Drive requires at least 5 supports",
          supportCount,
          requiredSupportCount: 5,
        });
      }
    }

    const drive = await Drive.create({
      title: title.trim(),
      type,
      description: description.trim(),
      report,
      organizer: req.user._id,
      coOrganizers: normalizedCoOrganizers,
      startsAt: start,
      endsAt: end,
      issueLocation: issueLocation?.trim(),
      meetingPoint: meetingPoint.trim(),
      maxParticipants: maxParticipants ?? undefined,
      organizerNote: organizerNote?.trim(),
      requiredMaterials: requiredMaterials.map((material) => material.trim()),
      contactInformation: contactInformation?.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Drive created successfully",
      data: drive,
    });
  } catch (error) {
    console.error("Error creating Drive:", error);
    const isValidationError = error.name === "ValidationError" || error.name === "CastError";
    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError ? "Invalid Drive data" : "Unable to create Drive",
      ...(isValidationError && { error: error.message }),
    });
  }
};

export { createDrive };
