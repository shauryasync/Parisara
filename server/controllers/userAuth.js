import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
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
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      name: newUser.name,
      email: newUser.email,
    });
  } catch (err) {
    console.error("Error registering user:", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export { registerUser };
