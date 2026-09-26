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
  },
  { timestamps: true },
);

export default mongoose.model("Report", reportSchema);
