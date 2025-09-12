const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp();
const app = express();
const port = process.env.PORT || 8080;

// 日志中间件（调试用）
app.use((req, res, next) => {
  console.log('Request URL:', req.url);
  console.log('Request Headers:', req.headers);
  next();
});

const corsOptions = {
  origin: "https://funnel-editor2025.netlify.app",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

app.get("/api/health", (req, res) => {
  res.status(200).send({ status: "ok" });
});

app.get("/api/templates", (req, res) => {
  const templatesDirectory = path.join(__dirname, 'build', 'templates');
  console.log(`Reading directory: ${templatesDirectory}`);
  fs.readdir(templatesDirectory, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${err.message}`);
      if (err.code === 'ENOENT') { return res.json([]); }
      return res.status(500).json({ error: "Failed to list templates", details: err.message });
    }
    const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
    res.json(jsonFiles);
  });
});

app.listen(port, () => {
  console.log(`Backend server for funnel-editor listening on port ${port}`);
});
