const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const fs = require("fs");      // <-- 1. 引入 'fs' 模块用于文件系统操作
const path = require("path");  // <-- 2. 引入 'path' 模块用于处理文件路径

// --- 初始化 Firebase Admin SDK ---
admin.initializeApp();

const app = express();
const port = process.env.PORT || 8080;

// --- 中间件设置 ---
app.use(cors({ origin: "https://funnel-editor2025.netlify.app" }));
app.use(express.json());

// --- 3. 添加静态文件服务 ---
// (非常重要) 这使得服务器可以访问 build 目录中的文件，包括您的模板
app.use(express.static(path.join(__dirname, 'build')));


// --- API 路由定义 ---

// (保留您现有的 grant-admin-role 路由不变)
app.post("/api/grant-admin-role", async (req, res) => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];
  if (!idToken) {
    return res.status(401).send({ error: "Unauthorized: Missing ID token." });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return res.status(403).send({ error: "Forbidden: Caller is not an admin." });
    }
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).send({ error: "Bad Request: Missing 'userId' in request body." });
    }
    await admin.auth().setCustomUserClaims(userId, { role: 'admin' });
    console.log(`Successfully granted admin role to user: ${userId}`);
    return res.status(200).send({ message: `Successfully granted admin role to user: ${userId}` });
  } catch (error) {
    console.error("Error in /api/grant-admin-role:", error);
    if (error.code === 'auth/id-token-expired') {
        return res.status(401).send({ error: "Unauthorized: ID token has expired." });
    }
    return res.status(500).send({ error: "Internal Server Error" });
  }
});

// --- 4. 添加新的 API 路由，用于获取模板列表 ---
app.get("/api/templates", (req, res) => {
  // 定义模板文件夹的路径 (相对于 build 目录)
  const templatesDirectory = path.join(__dirname, 'build', 'templates');

  // 读取该文件夹下的所有文件名
  fs.readdir(templatesDirectory, (err, files) => {
    if (err) {
      console.error("Could not list the templates directory.", err);
      // 如果文件夹不存在，返回一个空数组而不是错误，这样前端不会崩溃
      if (err.code === 'ENOENT') {
        return res.json([]);
      }
      return res.status(500).json({ error: "Failed to list templates" });
    }

    // 过滤出所有 .json 文件
    const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
    
    // 返回文件名列表
    res.json(jsonFiles);
  });
});


// --- 启动服务器 ---
app.listen(port, () => {
  console.log(`Backend server for funnel-editor listening on port ${port}`);
});
