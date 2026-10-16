import fs from "node:fs";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/user.models.js";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendVerificationEmail } from "../utils/sendVerifyEmail.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const removeTemporaryUpload = async (file) => {
  if (!file?.path) return;
  try {
    await fs.promises.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!name || !email || !password || !username) {
      return res.status(400).json({
        message: "Required Field!",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password length minimum 8 characters",
      });
    }

    const isUserExist = await User.findOne({ email });

    if (isUserExist) {
      if (!isUserExist.isVerified) {
        const verificationToken = crypto.randomBytes(32).toString("hex");
        isUserExist.verificationToken = verificationToken;
        isUserExist.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        await isUserExist.save();
        await sendVerificationEmail(isUserExist.email, verificationToken);

        return res.status(200).json({
          message: "Verification email sent. Please check your email to verify your account.",
        });
      }

      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    await sendVerificationEmail(newUser.email, verificationToken);

    res.status(201).json({
      message: "User registered successfully. Please check your email to verify your account.",
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
    });
  } catch (err) {
    console.error("Error registering user:", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        message: "Required Fields",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Not Registered",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid Password",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email address before logging in.",
      });
    }

    const token = jwt.sign(
      {
        _id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.status(200).json({
      message: "Login Successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

const getProfile = async (req, res) => {
  return res.status(200).json({
    _id: req.user._id,
    name: req.user.name,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    createdAt: req.user.createdAt,
    avatar: req.user.avatar,
  });
};

const updateAvatar = async (req, res) => {
  let uploadedAvatar;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "Select a profile photo to upload." });
    }

    uploadedAvatar = await uploadOnCloudinary(req.file.path);
    if (!uploadedAvatar?.secure_url || !uploadedAvatar.public_id) {
      throw new Error("Cloudinary did not return the uploaded profile photo.");
    }

    const previousAvatar = req.user.avatar;
    const previousPublicId = req.user.avatarPublicId;
    req.user.avatar = uploadedAvatar.secure_url;
    req.user.avatarPublicId = uploadedAvatar.public_id;

    try {
      await req.user.save();
    } catch (error) {
      try {
        await deleteImageFromCloudinary(uploadedAvatar.secure_url, uploadedAvatar.public_id);
      } catch (cleanupError) {
        console.error("Unable to clean up unsaved profile photo:", cleanupError);
      }
      throw error;
    }

    let cleanupWarning;
    if (previousAvatar) {
      try {
        await deleteImageFromCloudinary(previousAvatar, previousPublicId);
      } catch (error) {
        console.error("Unable to clean up previous profile photo:", error);
        cleanupWarning = "Your new photo was saved, but the previous photo could not be removed.";
      }
    }

    return res.status(200).json({
      message: "Profile photo updated.",
      avatar: req.user.avatar,
      ...(cleanupWarning ? { cleanupWarning } : {}),
    });
  } catch (error) {
    if (!uploadedAvatar) {
      try {
        await removeTemporaryUpload(req.file);
      } catch (cleanupError) {
        console.error("Unable to remove temporary profile photo:", cleanupError);
      }
    }
    console.error("Error updating profile photo:", error);
    return res.status(500).json({ message: "Unable to update your profile photo." });
  }
};

export { registerUser, verifyEmail, loginUser, getProfile, updateAvatar };
