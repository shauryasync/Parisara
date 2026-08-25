import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    message: "Parisara API running",
  });
});

app.listen(port, () => {
  console.log("Server running...");
});
