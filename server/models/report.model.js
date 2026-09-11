import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    username: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

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

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [commentSchema],
  },
  { timestamps: true },
);

export default mongoose.model("Report", reportSchema);
