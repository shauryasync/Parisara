import mongoose from "mongoose";

const driveParticipantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  drive: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Drive",
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

driveParticipantSchema.index({ user: 1, drive: 1 }, { unique: true });

export default mongoose.model("DriveParticipant", driveParticipantSchema);
