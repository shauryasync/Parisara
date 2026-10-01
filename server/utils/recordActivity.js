import Activity from "../models/activity.model.js";

const recordActivity = async ({ user, action, report, comment }) => {
  try {
    await Activity.create({ user, action, report, comment });
  } catch (error) {
    console.error("Failed to record activity:", error);
  }
};

export { recordActivity };
