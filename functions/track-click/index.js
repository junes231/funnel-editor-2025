console.log("⚡ track-click API Server starting...");

const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const { Buffer } = require('node:buffer');

// --- Firebase 初始化 ---
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const bucket = admin.storage().bucket(); // <-- [1] 确保获取了 Storage 桶

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
app.use(express.json({ limit: '25mb' })); // <-- [2] 允许更大的请求体来处理图片 Base64

// --- 路由定义：图片上传代理 ---
app.post("/uploadImage", async (req, res) => {
    // 【重要】在生产环境中，您应该在这里验证 Auth Token
    
    const { base64, mimeType, funnelId, outcomeId, fileName } = req.body.data || {};

    if (!base64 || !mimeType || !funnelId || !outcomeId || !fileName) {
        console.error("Missing required image data fields:", { funnelId, outcomeId, fileName });
        return res.status(400).send({ error: "Missing required image data." });
    }
    
    // 1. 构造文件路径
    const filePath = `funnel-images/${funnelId}/${outcomeId}/${fileName}`;
    const file = bucket.file(filePath);

    // 2. 将 Base64 字符串写入 Storage
    try {
        // 移除 Data URI 前缀 (e.g., 'data:image/png;base66,')
        const base64EncodedImageString = base64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64EncodedImageString, 'base64');
        
        await file.save(imageBuffer, {
            metadata: {
                contentType: mimeType,
            },
            public: true, // 确保文件可公开访问
            predefinedAcl: 'publicRead' // 确保文件可公开读取
        });
        
        // 3. 获取公开 URL (使用简单的公开链接格式)
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;
        
        console.log(`✅ File uploaded to: ${publicUrl}`);

        // 4. 返回公开 URL 给前端
        res.status(200).send({ data: { url: publicUrl } });

    } catch (error) {
        console.error("❌ Backend Storage Upload Failed:", error);
        res.status(500).send({ error: "Failed to upload file to Storage." });
    }
});

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

    // 确保 questions 是一个数组，以防数据损坏
    if (!Array.isArray(questions) || questions.length === 0) {
        return { status: 404, body: { error: "No valid questions found in funnel data." } };
    }

    let answerUpdated = false;
    
    // 2. 在内存中定位并修改 clickCount
    for (const question of questions) {
        // 使用 Object.keys 确保 questions.answers 是一个对象，且包含 answerId
        if (question.id === questionId && question.answers && Object.prototype.hasOwnProperty.call(question.answers, answerId)) {
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
