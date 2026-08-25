import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    message: "Parisara API running",
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log("Server running...");
    });
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });
