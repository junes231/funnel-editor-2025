const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp();
const app = express();
const port = process.env.PORT || 8080;

// --- CORS 配置 ---
const corsOptions = {
  origin: "https://funnel-editor2025.netlify.app",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json());

// --- 静态文件服务 ---
const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

// React 路由刷新返回 index.html
app.get('*', (req, res) => {
  // 只处理非 API 路径
  if (req.path.startsWith('/api')) return;
  res.sendFile(path.join(buildPath, 'index.html'));
});

// --- API 路由定义 ---
app.get("/api/health", (req, res) => {
  res.status(200).send({ status: "ok" });
});

app.post("/api/grant-admin-role", async (req, res) => {
  try {
    // 你的授权逻辑
  } catch (err) {
    console.error("Error in grant-admin-role:", err);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.get("/api/templates", (req, res) => {
  const templatesDirectory = path.join(buildPath, 'templates');
  fs.readdir(templatesDirectory, (err, files) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.json([]);
      }
      console.error("Failed to read templates directory:", err);
      return res.status(500).json({ error: "Failed to list templates" });
    }
    const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
    res.json(jsonFiles);
  });
});

// --- 启动服务器 ---
app.listen(port, () => {
  console.log(`Backend server for funnel-editor listening on port ${port}`);
});
