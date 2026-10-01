import Activity from "../models/activity.model.js";

const getActivities = async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user._id })
      .populate("report", "title placename category")
      .populate("comment", "content")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export { getActivities };
