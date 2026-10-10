import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/user.models.js";
import { sendVerificationEmail } from "../utils/sendVerifyEmail.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

const getProfile = async (req, res) => {
  const authHead = req.headers["authorization"];

  if (!authHead || !authHead.startsWith("Bearer "))
    return res.status(401).json({ message: "No Token" });

  try {
    const token = authHead.split(" ")[1];

    const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decodedPayload._id).select("name username email role");

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(401).json({ message: "Token Expired" });
  }
};

export { registerUser, verifyEmail, loginUser, getProfile };
