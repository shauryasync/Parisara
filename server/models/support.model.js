import mongoose from "mongoose";

const supportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      required: true,
    },
  },
  { timestamps: true },
);

supportSchema.index({ user: 1, report: 1 }, { unique: true });

export default mongoose.model("Support", supportSchema);
