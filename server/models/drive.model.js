import mongoose from "mongoose";

const driveSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["cleanup", "tree-planting", "waste-collection", "awareness", "restoration", "other"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },

    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      default: null,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coOrganizers: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
      validate: {
        validator: (coOrganizers) => coOrganizers.length <= 2,
        message: "A Drive can have no more than two co-organizers",
      },
    },

    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator: function (endsAt) {
          return !this.startsAt || endsAt > this.startsAt;
        },
        message: "The end time must be after the start time",
      },
    },
    issueLocation: {
      type: String,
      trim: true,
    },
    meetingPoint: {
      type: String,
      required: true,
      trim: true,
    },
    maxParticipants: {
      type: Number,
      min: 1,
      validate: {
        validator: (value) => value == null || Number.isInteger(value),
        message: "Maximum participants must be a whole number",
      },
    },
    organizerNote: {
      type: String,
      trim: true,
    },
    requiredMaterials: {
      type: [String],
      default: [],
    },
    contactInformation: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
    outcome: {
      type: String,
      trim: true,
    },
    completionImages: {
      type: [String],
      default: [],
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Drive", driveSchema);