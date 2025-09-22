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
    const funnelRef = db.collection("funnels").doc(funnelId);
    
    // 注意：这里的数据库路径需要和您的 Firestore 结构完全匹配
    const updatePath = `data.questions.find(q=>q.id==='${questionId}').answers.${answerId}.clickCount`;
    // 为了简化，我们使用更直接的更新方式，但这依赖于您的数据结构
    // 假设您的 answers 是一个 map
    const questionRef = funnelRef.collection('questions').doc(questionId);
     await db.runTransaction(async (transaction) => {
        const questionDoc = await transaction.get(questionRef);
        if (!questionDoc.exists) {
            throw "Question document not found!";
        }
        const answers = questionDoc.data().answers || {};
        const currentCount = answers[answerId]?.clickCount || 0;
        answers[answerId] = { ...answers[answerId], clickCount: currentCount + 1 };
        transaction.update(questionRef, { answers });
    });

    res.status(200).send({ data: { success: true } });
  } catch (err) {
    console.error("❌ Error tracking click:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.get("/test-cors", (req, res) => {
  res.status(200).send({ status: 'success', message: 'track-click CORS test successful!' });
});

// --- 启动服务器 ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 track-click API Server listening on port ${PORT}`);
});
