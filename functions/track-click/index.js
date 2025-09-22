console.log("⚡ track-click API Server starting...");

const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

// --- Firebase 初始化 ---
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// --- Express 应用创建 ---
const app = express();

// --- CORS 中间件 ---
const corsOptions = {
  origin: "*",
  methods: "GET,POST,OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
};
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

// --- 路由定义 ---
app.post("/trackClick", async (req, res) => {
  try {
    const { funnelId, questionId, answerId } = req.body.data || {};
    if (!funnelId || !questionId || !answerId) {
      return res.status(400).send({ error: "Missing required fields" });
    }
    
    // 您的点击追踪逻辑...
    const answerRef = db.collection('funnels').doc(funnelId).collection('questions').doc(questionId);
    await answerRef.set({
      answers: {
        [answerId]: {
          clickCount: admin.firestore.FieldValue.increment(1)
        }
      }
    }, { merge: true });

    res.status(200).send({ data: { success: true } });
  } catch (err) {
    console.error("❌ Error tracking click:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

// --- ↓↓↓ 核心修改在这里 ↓↓↓ ---
// 新增：一个专门用于测试 CORS 是否配置成功的路由
app.get("/test-cors", (req, res) => {
  console.log("✅ /test-cors endpoint hit.");
  res.status(200).send({ status: 'success', message: 'track-click CORS test successful!' });
});
// --- ↑↑↑ 修改结束 ↑↑↑ ---


// --- 启动服务器 ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 track-click API Server listening on port ${PORT}`);
});
