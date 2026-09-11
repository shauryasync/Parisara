import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

const registerUser = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !email || !password || !username) {
      return res.status(400).json({
        message: "Required Field!",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password length minimum 8 characters",
      });
    }

    const isUserExist = await User.findOne({ email });

    if (isUserExist) {
      return res.status(400).json({
        message: "Email already exits",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
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

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Required Fields",
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

    const user = await User.findById(decodedPayload._id).select("name email");

    res.json({ email: user.email, name: user.name });
  } catch (error) {
    res.status(401).json({ message: "Token Expired" });
  }
};
export { registerUser, loginUser, getProfile };
