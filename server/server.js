import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { router } from "./routes/userRoutes.js";

dotenv.config({
  path: "./.env",
});

const app = express();

app.use(cors());

const port = process.env.PORT || 3000;

//middlewares
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Parisara API running",
  });
});

app.use("/api", router);

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
