import mongoose from "mongoose";
import Drive from "../models/drive.model.js";
import Report from "../models/report.model.js";
import Support from "../models/support.model.js";
import User from "../models/user.models.js";
import DriveParticipant from "../models/driveParticipant.model.js";

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

const getDrives = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status || "upcoming";
    const type = req.query.type;

    const query = { status };
    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const totalDrives = await Drive.countDocuments(query);
    const drives = await Drive.find(query).sort({ startsAt: 1 }).skip(skip).limit(limit);

    res.status(200).json({
      success: true,
      data: drives,
      pagination: {
        total: totalDrives,
        page,
        limit,
        pages: Math.ceil(totalDrives / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching drives:", error);
    res.status(500).json({ success: false, message: "Unable to fetch drives" });
  }
};

const getDriveById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }

    const drive = await Drive.findById(id)
      .populate("organizer", "name username")
      .populate("coOrganizers", "name username")
      .populate("report");

    if (!drive) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    const participantCount = await DriveParticipant.countDocuments({ drive: drive._id });

    let isJoined = false;
    if (req.user) {
      const existing = await DriveParticipant.findOne({ drive: drive._id, user: req.user._id });
      isJoined = !!existing;
    }

    res.status(200).json({
      success: true,
      data: {
        ...drive.toObject(),
        participantCount,
        isJoined,
      },
    });
  } catch (error) {
    console.error("Error fetching drive by ID:", error);
    res.status(500).json({ success: false, message: "Unable to fetch drive" });
  }
};

const joinDrive = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    if (drive.status === "completed" || drive.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot join a drive that is ${drive.status}`,
      });
    }

    const isOrganizer = String(drive.organizer) === String(userId);
    const isCoOrganizer = (drive.coOrganizers || []).some(
      (coId) => String(coId) === String(userId),
    );

    if (isOrganizer || isCoOrganizer) {
      return res.status(400).json({
        success: false,
        message: "Organizers and co-organizers are already part of the drive management",
      });
    }

    const existingParticipant = await DriveParticipant.findOne({ drive: id, user: userId });
    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: "You have already joined this drive",
      });
    }

    if (drive.maxParticipants) {
      const currentCount = await DriveParticipant.countDocuments({ drive: id });
      if (currentCount >= drive.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: "Drive has reached maximum participant capacity",
        });
      }
    }

    let newParticipant;
    try {
      newParticipant = await DriveParticipant.create({ drive: id, user: userId });
    } catch (createErr) {
      if (createErr.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "You have already joined this drive",
        });
      }
      throw createErr;
    }

    if (drive.maxParticipants) {
      const updatedCount = await DriveParticipant.countDocuments({ drive: id });
      if (updatedCount > drive.maxParticipants) {
        await DriveParticipant.deleteOne({ _id: newParticipant._id });
        return res.status(400).json({
          success: false,
          message: "Drive has reached maximum participant capacity",
        });
      }
    }

    const finalCount = await DriveParticipant.countDocuments({ drive: id });

    return res.status(200).json({
      success: true,
      message: "Successfully joined the drive",
      data: {
        participantCount: finalCount,
        isJoined: true,
      },
    });
  } catch (error) {
    console.error("Error joining drive:", error);
    return res.status(500).json({ success: false, message: "Unable to join drive" });
  }
};

const leaveDrive = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    const deleted = await DriveParticipant.findOneAndDelete({ drive: id, user: userId });
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "You are not currently a participant of this drive",
      });
    }

    const participantCount = await DriveParticipant.countDocuments({ drive: id });

    return res.status(200).json({
      success: true,
      message: "Successfully left the drive",
      data: {
        participantCount,
        isJoined: false,
      },
    });
  } catch (error) {
    console.error("Error leaving drive:", error);
    return res.status(500).json({ success: false, message: "Unable to leave drive" });
  }
};

const getDriveParticipants = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    const participants = await DriveParticipant.find({ drive: id })
      .populate("user", "name username")
      .sort({ joinedAt: 1 });

    const formattedParticipants = participants.map((p) => ({
      _id: p._id,
      joinedAt: p.joinedAt,
      user: {
        _id: p.user?._id,
        name: p.user?.name || "Unknown",
        username: p.user?.username || "",
      },
    }));

    let isJoined = false;
    if (req.user) {
      isJoined = participants.some((p) => p.user && String(p.user._id) === String(req.user._id));
    }

    return res.status(200).json({
      success: true,
      data: {
        participants: formattedParticipants,
        count: formattedParticipants.length,
        isJoined,
      },
    });
  } catch (error) {
    console.error("Error fetching drive participants:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch participants" });
  }
};

export { createDrive, getDrives, getDriveById, joinDrive, leaveDrive, getDriveParticipants };
