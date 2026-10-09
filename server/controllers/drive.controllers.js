import mongoose from "mongoose";
import Drive from "../models/drive.model.js";
import Report from "../models/report.model.js";
import Support from "../models/support.model.js";
import User from "../models/user.models.js";
import DriveParticipant from "../models/driveParticipant.model.js";
import DriveComment from "../models/driveComment.model.js";

const getDerivedStatus = (drive, now = new Date()) => {
  if (!drive) return "upcoming";
  if (drive.status === "completed" || drive.status === "cancelled") {
    return drive.status;
  }
  const start = new Date(drive.startsAt);
  if (now >= start) {
    return "ongoing";
  }
  return "upcoming";
};

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
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Start and end dates must be valid",
    });
  }

  if (start <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "The start date and time must be in the future",
    });
  }

  if (end <= start) {
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
    const report = req.query.report;
    const joinedOnly = req.query.joined === "true";
    const now = new Date();

    const query = {};
    if (status === "upcoming" || status === "ongoing") {
      query.status = { $nin: ["completed", "cancelled"] };
      query.startsAt = status === "upcoming" ? { $gt: now } : { $lte: now };
    } else {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }
    if (report !== undefined) {
      if (typeof report !== "string" || !mongoose.isValidObjectId(report)) {
        return res.status(400).json({ success: false, message: "Invalid Report ID" });
      }
      query.report = report;
    }
    if (joinedOnly) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Sign in to view Drives you have joined",
        });
      }

      const joinedDriveIds = await DriveParticipant.distinct("drive", { user: req.user._id });
      query._id = { $in: joinedDriveIds };
    }

    const skip = (page - 1) * limit;

    const totalDrives = await Drive.countDocuments(query);
    const drives = await Drive.find(query).sort({ startsAt: 1 }).skip(skip).limit(limit);

    res.status(200).json({
      success: true,
      data: drives.map((drive) => {
        const driveObj = drive.toObject();
        driveObj.status = getDerivedStatus(drive, now);
        return driveObj;
      }),
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

    const driveObj = drive.toObject();
    driveObj.status = getDerivedStatus(drive);

    res.status(200).json({
      success: true,
      data: {
        ...driveObj,
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

const editDrive = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.user._id);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    const isOrganizer = String(drive.organizer) === userId;
    const isCoOrganizer = drive.coOrganizers.some((coId) => String(coId) === userId);

    if (!isOrganizer && !isCoOrganizer) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit this drive",
      });
    }

    const allowedUpdates = [
      "title",
      "type",
      "description",
      "startsAt",
      "endsAt",
      "issueLocation",
      "meetingPoint",
      "maxParticipants",
      "organizerNote",
      "requiredMaterials",
      "contactInformation",
    ];

    const updates = {};
    for (const key of Object.keys(req.body)) {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    }

    if (updates.startsAt || updates.endsAt) {
      const start = updates.startsAt ? new Date(updates.startsAt) : drive.startsAt;
      const end = updates.endsAt ? new Date(updates.endsAt) : drive.endsAt;
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({
          success: false,
          message: "End date must be valid and after the start date",
        });
      }
    }

    if (updates.maxParticipants !== undefined && updates.maxParticipants !== null) {
      if (!Number.isInteger(updates.maxParticipants) || updates.maxParticipants < 1) {
        return res.status(400).json({
          success: false,
          message: "Maximum participants must be a positive whole number",
        });
      }

      const participantCount = await DriveParticipant.countDocuments({ drive: id });
      if (updates.maxParticipants < participantCount) {
        return res.status(400).json({
          success: false,
          message: "Maximum participants cannot be lower than the current participant count",
          participantCount,
        });
      }
    }

    if (updates.requiredMaterials !== undefined) {
      if (!Array.isArray(updates.requiredMaterials) || updates.requiredMaterials.some(m => typeof m !== 'string' || !m.trim())) {
        return res.status(400).json({
          success: false,
          message: "Required materials must be an array of non-empty strings",
        });
      }
      updates.requiredMaterials = updates.requiredMaterials.map(m => m.trim());
    }

    for (const [key, value] of Object.entries(updates)) {
      if (['title', 'description', 'meetingPoint', 'issueLocation', 'organizerNote', 'contactInformation'].includes(key)) {
         if (value !== undefined && value !== null) {
            updates[key] = value.trim();
         }
      }
    }

    Object.assign(drive, updates);
    await drive.save();

    return res.status(200).json({
      success: true,
      message: "Drive updated successfully",
      data: drive,
    });
  } catch (error) {
    console.error("Error editing drive:", error);
    if (error.name === "ValidationError") {
       return res.status(400).json({ success: false, message: "Invalid Drive data", error: error.message });
    }
    return res.status(500).json({ success: false, message: "Unable to edit drive" });
  }
};

const addCoOrganizer = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: targetUserId } = req.body;
    const requestUserId = String(req.user._id);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }
    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, message: "Invalid Target User ID" });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    const isOrganizer = String(drive.organizer) === requestUserId;
    const isCoOrganizer = drive.coOrganizers.some((coId) => String(coId) === requestUserId);

    if (!isOrganizer && !isCoOrganizer) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to manage co-organizers",
      });
    }

    const targetUserExists = await User.exists({ _id: targetUserId });
    if (!targetUserExists) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(drive.organizer) === String(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Primary organizer cannot be added as a co-organizer",
      });
    }

    if (drive.coOrganizers.some(c => String(c) === String(targetUserId))) {
      return res.status(400).json({
        success: false,
        message: "User is already a co-organizer",
      });
    }

    if (drive.coOrganizers.length >= 2) {
      return res.status(400).json({
        success: false,
        message: "Maximum of 2 co-organizers allowed",
      });
    }

    drive.coOrganizers.push(targetUserId);
    await drive.save();

    return res.status(200).json({
      success: true,
      message: "Co-organizer added successfully",
      data: drive.coOrganizers,
    });
  } catch (error) {
    console.error("Error adding co-organizer:", error);
    return res.status(500).json({ success: false, message: "Unable to add co-organizer" });
  }
};

const removeCoOrganizer = async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const requestUserId = String(req.user._id);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }
    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, message: "Invalid Target User ID" });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    const isOrganizer = String(drive.organizer) === requestUserId;
    const isCoOrganizer = drive.coOrganizers.some((coId) => String(coId) === requestUserId);

    if (!isOrganizer && !isCoOrganizer) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to manage co-organizers",
      });
    }

    if (String(drive.organizer) === String(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Primary organizer cannot be removed",
      });
    }

    const isTargetCoOrganizer = drive.coOrganizers.some(c => String(c) === String(targetUserId));
    if (!isTargetCoOrganizer) {
      return res.status(400).json({
        success: false,
        message: "User is not a co-organizer",
      });
    }

    drive.coOrganizers = drive.coOrganizers.filter(c => String(c) !== String(targetUserId));
    await drive.save();

    return res.status(200).json({
      success: true,
      message: "Co-organizer removed successfully",
      data: drive.coOrganizers,
    });
  } catch (error) {
    console.error("Error removing co-organizer:", error);
    return res.status(500).json({ success: false, message: "Unable to remove co-organizer" });
  }
};

const cancelDrive = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.user._id);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    const isOrganizer = String(drive.organizer) === userId;
    const isCoOrganizer = (drive.coOrganizers || []).some((coId) => String(coId) === userId);

    if (!isOrganizer && !isCoOrganizer) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to cancel this drive",
      });
    }

    if (drive.status === "cancelled" || drive.status === "completed") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a drive that is already ${drive.status}`,
      });
    }

    const derivedStatus = getDerivedStatus(drive);
    if (derivedStatus !== "upcoming") {
      return res.status(400).json({
        success: false,
        message: "Only upcoming drives can be cancelled",
      });
    }

    drive.status = "cancelled";
    await drive.save();

    return res.status(200).json({
      success: true,
      message: "Drive cancelled successfully",
      data: drive,
    });
  } catch (error) {
    console.error("Error cancelling drive:", error);
    return res.status(500).json({ success: false, message: "Unable to cancel drive" });
  }
};

const completeDrive = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.user._id);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    const isOrganizer = String(drive.organizer) === userId;
    const isCoOrganizer = (drive.coOrganizers || []).some((coId) => String(coId) === userId);

    if (!isOrganizer && !isCoOrganizer) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to complete this drive",
      });
    }

    if (drive.status === "completed" || drive.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot complete a drive that is already ${drive.status}`,
      });
    }

    const now = new Date();
    if (now < new Date(drive.startsAt)) {
      return res.status(400).json({
        success: false,
        message: "Cannot complete a drive before its start time",
      });
    }

    drive.status = "completed";
    drive.completedAt = new Date();
    drive.completedBy = req.user._id;

    if (req.body && typeof req.body.outcome === "string" && req.body.outcome.trim()) {
      drive.outcome = req.body.outcome.trim();
    }

    await drive.save();

    return res.status(200).json({
      success: true,
      message: "Drive completed successfully",
      data: drive,
    });
  } catch (error) {
    console.error("Error completing drive:", error);
    return res.status(500).json({ success: false, message: "Unable to complete drive" });
  }
};

const getDriveComments = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }

    const driveExists = await Drive.exists({ _id: id });
    if (!driveExists) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    const comments = await DriveComment.find({ drive: id })
      .populate("user", "name username")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error("Error fetching drive comments:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch comments" });
  }
};

const createDriveComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Drive ID" });
    }

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ success: false, message: "Comment content is required" });
    }

    const driveExists = await Drive.exists({ _id: id });
    if (!driveExists) {
      return res.status(404).json({ success: false, message: "Drive not found" });
    }

    const comment = await DriveComment.create({
      drive: id,
      user: req.user._id,
      content: content.trim(),
    });

    await comment.populate("user", "name username");

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    console.error("Error creating drive comment:", error);
    return res.status(500).json({ success: false, message: "Unable to create comment" });
  }
};

const deleteDriveComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({ success: false, message: "Invalid Comment ID" });
    }

    const comment = await DriveComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    if (String(comment.user._id || comment.user) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the comment author can delete their comment",
      });
    }

    await DriveComment.deleteOne({ _id: commentId });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting drive comment:", error);
    return res.status(500).json({ success: false, message: "Unable to delete comment" });
  }
};

export {
  createDrive,
  getDrives,
  getDriveById,
  joinDrive,
  leaveDrive,
  getDriveParticipants,
  editDrive,
  addCoOrganizer,
  removeCoOrganizer,
  cancelDrive,
  completeDrive,
  getDriveComments,
  createDriveComment,
  deleteDriveComment,
};
