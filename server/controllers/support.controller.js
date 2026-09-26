import Support from "../models/support.model.js";
import Report from "../models/report.model.js";

const createNewSupport = async (req, res) => {
  try {
    const userId = req.user._id;

    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const existingSupport = await Support.exists({
      user: userId,
      report: id,
    });

    if (existingSupport) {
      return res.status(409).json({
        success: false,
        message: "You have already supported this report",
      });
    }

    const newSupport = await Support.create({
      user: userId,
      report: id,
    });

    const count = await Support.countDocuments({
      report: id,
    });

    const isSupported = await Support.exists({
      user: userId,
      report: id,
    });

    return res.status(201).json({
      success: true,
      message: "Support added successfully",
      data: {
        support: newSupport,
        count,
        supportedByCurrentUser: Boolean(isSupported),
      },
    });
  } catch (error) {
    const isDuplicateSupport =
      error?.code === 11000 ||
      error?.code === "11000" ||
      (error?.name === "MongoServerError" && /duplicate key/i.test(error?.message ?? ""));

    if (isDuplicateSupport) {
      return res.status(409).json({
        success: false,
        message: "You have already supported this report",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getSupport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const count = await Support.countDocuments({
      report: id,
    });

    const isSupported = await Support.exists({
      user: userId,
      report: id,
    });

    return res.status(200).json({
      success: true,
      data: {
        count,
        supportedByCurrentUser: Boolean(isSupported),
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

const deleteSupport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const deleteSupport = await Support.findOneAndDelete({
      user: userId,
      report: id,
    });
    const count = await Support.countDocuments({
      report: id,
    });

    if (!deleteSupport) {
      return res.status(404).json({
        success: false,
        message: "You have not supported this report",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Support removed successfully",
      data: {
        count,
        supportedByCurrentUser: false,
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

export { deleteSupport, getSupport, createNewSupport };
