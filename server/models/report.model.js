import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      required: true,
    },
    images: [{ type: String }],
    imagePublicIds: [{ type: String }],

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    category: {
      type: String,
      enum: ["pollution", "waste", "deforestation", "water", "other"],
      required: true,
    },
    hashtags: [{ type: String }],

    placename: {
      type: String,
      required: true,
    },
    geo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number] },
    },

    status: {
      type: String,
      enum: ["reported", "in-progress", "resolved"],
      default: "reported",
    },

    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },

    moderationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    moderatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Report", reportSchema);
