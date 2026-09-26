import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { router as userRouter } from "./routes/userRoutes.js";
import { router as reportRouter } from "./routes/report.routes.js";
import { router as supportRouter } from "./routes/support.routes.js";
import { router as commentRouter } from "./routes/comment.routes.js";
import { router as saveRouter } from "./routes/save.routes.js";

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

app.use("/api", userRouter);
app.use("/api/reports", reportRouter);
app.use("/api/reports", supportRouter);
app.use("/api/reports", commentRouter);
app.use("/api/reports", saveRouter);

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
