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
  // 使用事务来确保读取和写入操作的原子性，避免并发冲突
  const transactionResult = await db.runTransaction(async (transaction) => {
    const { funnelId, questionId, answerId } = req.body.data || {};

    if (!funnelId || !questionId || !answerId) {
      return { status: 400, body: { error: "Missing required fields" } };
    }
    
    const funnelRef = db.collection("funnels").doc(funnelId);
    const funnelDoc = await transaction.get(funnelRef);

    if (!funnelDoc.exists) {
      return { status: 404, body: { error: "Funnel not found" } };
    }

    // 1. 读取整个数据对象
    const funnel = funnelDoc.data();
    const funnelData = funnel.data || {};
    const questions = funnelData.questions || [];

    if (!Array.isArray(questions) || questions.length === 0) {
        return { status: 404, body: { error: "No valid questions found in funnel data." } };
    }

    let answerUpdated = false;
    
    // 2. 在内存中定位并修改 clickCount
    for (const question of questions) {
        if (question.id === questionId && question.answers && question.answers[answerId]) {
            // 确保 clickCount 存在并递增
            const currentCount = question.answers[answerId].clickCount || 0;
            question.answers[answerId].clickCount = currentCount + 1;
            answerUpdated = true;
            break;
        }
    }

    if (!answerUpdated) {
        return { status: 404, body: { error: "Question or Answer not found." } };
    }

    // 3. 写回整个 data 对象 (transaction 确保了原子性)
    await transaction.update(funnelRef, {
        data: funnelData
    });

    return { status: 200, body: { data: { success: true, message: `Click count for ${answerId} incremented.` } } };

  }).catch(err => {
    console.error("❌ Error tracking click (Transaction Failed):", err);
    return { status: 500, body: { error: "Internal server error" } };
  });

  res.status(transactionResult.status).send(transactionResult.body);
});

app.get("/test-cors", (req, res) => {
  res.status(200).send({ status: 'success', message: 'track-click CORS test successful!' });
});

// --- 启动服务器 ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 track-click API Server listening on port ${PORT}`);
});
