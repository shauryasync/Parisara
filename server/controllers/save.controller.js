import Report from "../models/report.model.js";
import Save from "../models/save.model.js";

const createNewSave = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "The Report Does not Exists",
      });
    }

    const existingSave = await Save.exists({
      user: userId,
      report: id,
    });

    if (existingSave) {
      return res.status(409).json({
        success: false,
        message: "You have already saved this report",
      });
    }
    const newSave = await Save.create({
      user: userId,
      report: id,
    });

    const count = await Save.countDocuments({
      report: id,
    });

    const isSaved = await Save.exists({
      user: userId,
      report: id,
    });

    return res.status(201).json({
      success: true,
      message: "Saved Successfully",
      data: {
        savedByCurrentUser: Boolean(isSaved),
      },
    });
  } catch (error) {
    const isDuplicateSave =
      error?.code === 11000 ||
      error?.code === "11000" ||
      (error?.name === "MongoServerError" && /duplicate key/i.test(error?.message ?? ""));

    if (isDuplicateSave) {
      return res.status(409).json({
        success: false,
        message: "You have already saved this report",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getSave = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "The Report Does not Exists",
      });
    }

    const count = await Save.countDocuments({
      report: id,
    });

    const isSaved = await Save.exists({
      user: userId,
      report: id,
    });

    return res.status(200).json({
      success: true,
      data: {
        savedByCurrentUser: Boolean(isSaved),
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const deleteSave = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const deletedSave = await Save.findOneAndDelete({
      user: userId,
      report: id,
    });

    if (!deletedSave) {
      return res.status(404).json({
        success: false,
        message: "You have not saved this report",
      });
    }

    const count = await Save.countDocuments({
      report: id,
    });

    return res.status(200).json({
      success: true,
      message: "Save removed successfully",
      data: {
        count,
        savedByCurrentUser: false,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export { createNewSave, getSave, deleteSave };
