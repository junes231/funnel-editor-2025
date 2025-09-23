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

    // --- ↓↓↓ 核心修复在这里 ↓↓↓ ---
    // 使用“点表示法”来精确定位并更新嵌套对象中的 clickCount 字段
    // 1. 首先，我们需要找到正确的 question 在数组中的索引
    const funnelDoc = await funnelRef.get();
    if (!funnelDoc.exists) {
        return res.status(404).send({ error: "Funnel not found" });
    }
    const questions = funnelDoc.data().data?.questions || [];
    const questionIndex = questions.findIndex(q => q.id === questionId);

    if (questionIndex === -1) {
        return res.status(404).send({ error: "Question not found in funnel" });
    }

    // 2. 构建正确的更新路径
    // 路径应该是 `data.questions.[索引].answers.[答案ID].clickCount`
    const updatePath = `data.questions.${questionIndex}.answers.${answerId}.clickCount`;

    // 3. 使用 update 方法和 FieldValue.increment 来原子性地增加计数值
    await funnelRef.update({
      [updatePath]: admin.firestore.FieldValue.increment(1)
    });
    // --- ↑↑↑ 修复结束 ↑↑↑ ---

    res.status(200).send({ data: { success: true, message: `Click count for ${answerId} incremented.` } });
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
