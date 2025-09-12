// 文件路径: server.js

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// --- 修改开始 ---
// 使用 try...catch 结构包裹初始化过程
try {
  admin.initializeApp();
  // 如果成功，打印一条日志，方便我们在日志中确认
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  // 如果失败，打印出详细的错误信息
  console.error("CRITICAL: Error initializing Firebase Admin SDK:", error);
  
  // 强制退出进程。这能确保Cloud Run知道程序是因为这个特定错误而终止的。
  process.exit(1); 
}

const app = express();
const port = process.env.PORT || 8080;

// --- 中间件设置 ---
// 允许您的 Netlify 前端应用进行跨域访问
app.use(cors({ origin: "https://funnel-editor2025.netlify.app" }));
// 解析 JSON 请求体
app.use(express.json());


// --- API 路由定义 ---
app.post("/api/grant-admin-role", async (req, res) => {
  // 1. 从前端请求的 Authorization 头部获取 ID token
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    return res.status(401).send({ error: "Unauthorized: Missing ID token." });
  }

  try {
    // 2. 验证 ID token 并检查调用者是否为管理员
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return res.status(403).send({ error: "Forbidden: Caller is not an admin." });
    }

    // 3. 从请求体中获取目标用户的ID
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).send({ error: "Bad Request: Missing 'userId' in request body." });
    }
    
    // 4. 为目标用户设置自定义声明 (admin 角色)
    await admin.auth().setCustomUserClaims(userId, { role: 'admin' });
    
    // 5. 返回成功响应
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


// --- 启动服务器 ---
app.listen(port, () => {
  console.log(`Backend server for funnel-editor listening on port ${port}`);
});
