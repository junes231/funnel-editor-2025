console.log("⚡ track-click API Server starting...");

const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

// --- Firebase 初始化 ---
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: 'process.env.STORAGE_BUCKET' // 修正存储桶名称
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket('process.env.STORAGE_BUCKET'); // 修正存储桶名称

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

// --- 生成预签名上传 URL ---
app.post("/generateUploadUrl", async (req, res) => {
  const { funnelId, outcomeId, fileName, fileType } = req.body.data || req.body; // 兼容直接发送字段

  // --- 1️⃣ 基础验证 ---
  if (!funnelId || !outcomeId || !fileName || !fileType) {
    return res.status(400).send({ 
      error: "Missing required file info (funnelId, outcomeId, fileName, fileType)." 
    });
  }

  // --- 2️⃣ 文件类型白名单 ---
  const allowedMimeTypes = [
    "image/png", "image/jpeg", "image/webp", "image/gif",
    "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "application/zip", "application/x-zip-compressed", 
    "application/x-rar-compressed", "video/mp4", "audio/mpeg", "audio/wav"
  ];

  if (!allowedMimeTypes.includes(fileType)) {
    console.warn(`🚫 Blocked unsupported file type: ${fileType}`);
    return res.status(400).send({
      error: `Unsupported file type: ${fileType}.`,
    });
  }

  // --- 3️⃣ 自动分类 ---
  let folder = "others";
  if (fileType.startsWith("image/")) folder = "images";
  else if (fileType.startsWith("video/")) folder = "videos";
  else if (fileType.startsWith("audio/")) folder = "audio";
  else if (fileType.includes("pdf") || fileType.includes("word") || fileType.includes("excel"))
    folder = "docs";
  else if (fileType.includes("zip") || fileType.includes("rar"))
    folder = "archives";
  
  // --- 4️⃣ 自动重命名和构造路径 ---
   
  const timestamp = Date.now();
  const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
  const safeFileName = ext
    ? `${timestamp}-${fileName.replace(/[^\w.-]/g, '_')}`
    : `${timestamp}-${fileName}`;
  
  const filePath = `uploads/${folder}/${funnelId}/${outcomeId}/${safeFileName}`;
  const file = bucket.file(filePath);

  try {
    // 生成预签名 URL
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 10 * 60 * 1000, // 10 分钟有效
      contentType: fileType,
      virtualHostedStyle: false,
      region: 'us-central1',
    });
    
    // 构造最终文件的公共 URL
    const publicFileUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // 🧠 关键调试日志
    console.log("✅ Signed URL generated for:", fileName);
    console.log("📤 uploadUrl typeof:", typeof uploadUrl);
    console.log("📤 uploadUrl preview:", uploadUrl.substring(0, 120) + "...");

    res.status(200).send({
      data: {
        uploadUrl: String(uploadUrl), // 👈 确保是字符串
        fileUrl: publicFileUrl
      }
    });
  } catch (error) {
    console.error("❌ Failed to generate signed URL:", error);
    res.status(500).send({
      error: "Failed to generate signed URL.",
      details: error.message || error
    });
  }
});

// 由于移除了 app.use(express.json()), 必须只对需要 JSON 的路由使用它
app.post("/trackClick", express.json(), async (req, res) => {
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
// 打印所有注册的路由，方便调试
app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(`[ROUTE] ${Object.keys(r.route.methods).join(',').toUpperCase()} ${r.route.path}`);
  }
});
console.log(app._router.stack
  .filter(r => r.route)
  .map(r => ({
    path: r.route.path,
    methods: r.route.methods
  }))
);
// --- 启动服务器 ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 track-click API Server listening on port ${PORT}`);
});
