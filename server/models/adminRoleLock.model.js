import mongoose from "mongoose";

const adminRoleLockSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    versionKey: false,
    collection: "adminrolelocks",
  },
);

export default mongoose.model("AdminRoleLock", adminRoleLockSchema);
