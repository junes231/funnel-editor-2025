console.log("⚡ index.js starting...");

const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const path = require("path");

// --- 1. 初始化 Firebase ---
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log("✅ Firebase Admin SDK initialized successfully.");
  } catch (e) {
    console.error("❌ Firebase Admin SDK initialization failed:", e);
    process.exit(1);
  }
}
const db = admin.firestore();

// --- 2. 创建 Express ---
const app = express();
console.log("✅ Express app created");


// --- ↓↓↓ 核心修改从这里开始 ↓↓↓ ---

// 3. 增强版 CORS 中间件
// 创建一个可重用的 CORS 配置
const corsOptions = {
  origin: "*", // 允许任何域名访问
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", // 允许的方法
  allowedHeaders: "Content-Type,Authorization", // 允许的请求头
};

// a) 对所有 OPTIONS "预检请求" 启用 CORS
// 这是解决复杂请求被拦截的关键
app.options('*', cors(corsOptions));

// b) 对所有常规请求启用 CORS
app.use(cors(corsOptions));

// c) JSON 解析中间件
app.use(express.json());
console.log("✅ Enhanced Middleware (CORS, JSON) registered");


// --- 3. 环境变量读取 ---
const PORT = process.env.PORT || 8080;
const TRACK_CLICK_URL = process.env.TRACK_CLICK_URL; // 点击统计服务 URL
const GRANT_ADMIN_URL = process.env.GRANT_ADMIN_URL; // 管理员服务 URL

console.log(`🌐 Track click service URL: ${TRACK_CLICK_URL}`);
console.log(`🌐 Admin service URL: ${GRANT_ADMIN_URL}`);


// --- 4. Route Handlers ---
async function trackClickHandler(req, res) {
  // 为这个函数包裹 try...catch，确保即使内部出错，服务器也不会无响应
  try {
    const { funnelId, questionId, answerId } = req.body.data || {};
    if (!funnelId || !questionId || !answerId) {
      return res.status(400).send({ error: "Missing required fields" });
    }
    const funnelRef = db.collection("funnels").doc(funnelId);
    const funnelDoc = await funnelRef.get();
    if (!funnelDoc.exists) return res.status(404).send({ error: "Funnel not found" });

    const funnelData = funnelDoc.data();
    // 注意：这里的路径需要与您的 Firestore 结构完全匹配
    const questions = funnelData.data?.questions || [];
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return res.status(404).send({ error: "Question not found" });

    const answers = questions[questionIndex].answers;
    if (!answers || !answers[answerId]) return res.status(404).send({ error: "Answer not found" });

    const updatePath = `data.questions.${questionIndex}.answers.${answerId}.clickCount`;
    await funnelRef.update({ [updatePath]: admin.firestore.FieldValue.increment(1) });

    res.status(200).send({ data: { success: true, message: `Click tracked for answer ${answerId}` } });

  } catch (err) {
    console.error("❌ Error tracking click:", err);
    res.status(500).send({ error: "Internal server error" });
  }
}

// --- 5. Admin 验证中间件 ---
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(403).send("Unauthorized");
  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== "admin") return res.status(403).send("Unauthorized");
    next();
  } catch (err) {
    console.error("❌ Admin verification failed:", err);
    res.status(403).send("Unauthorized");
  }
}
async function grantAdminRoleHandler(req, res) {
  const email = req.body.data?.email;
  if (!email) return res.status(400).send({ error: "Missing data.email" });
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    res.status(200).send({ data: { message: `${email} is now admin` } });
  } catch (err) {
    console.error("❌ Error granting admin role:", err);
    res.status(500).send({ error: "Internal server error" });
  }
}

async function getUserRoleHandler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(403).send("Unauthorized");
  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const role = decodedToken.role || "user";
    res.status(200).send({ data: { role } });
  } catch (err) {
    console.error("❌ Error getting user role:", err);
    res.status(500).send({ error: "Internal server error" });
  }
}

// --- 6. 路由定义 ---
app.post("/trackClick", trackClickHandler);
app.post("/grantAdminRole", verifyAdmin, grantAdminRoleHandler);
app.get("/getUserRole", getUserRoleHandler);


// 新增：一个专门用于测试 CORS 是否配置成功的路由
app.get("/test-cors", (req, res) => {
  console.log("✅ /test-cors endpoint hit.");
  res.status(200).send({ status: 'success', message: 'CORS test successful!' });
});
// 静态文件
app.use(express.static(path.join(__dirname, "../build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

// --- 7. 启动服务器 ---

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
