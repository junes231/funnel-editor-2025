console.log("⚡ track-click API Server starting...");

const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const multer = require('multer'); // <-- 【1. 导入 multer】
const { Buffer } = require('node:buffer');

// --- Firebase 初始化 ---
if (!admin.apps.length) {
  admin.initializeApp({
      // 显式指定 Storage Bucket 名称
      storageBucket: 'funnel-editor-netlify.appspot.com' 
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket('funnel-editor-netlify.appspot.com'); 

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

// 【3. 配置 Multer：使用内存存储，以获取文件 Buffer】
const upload = multer({ 
    storage: multer.memoryStorage(), 
    limits: { fileSize: 25 * 1024 * 1024 } // 限制文件大小为 25MB 
});

// --- 路由定义：图片上传代理 (Multipart/form-data) ---
// 【4. 使用 Multer 中间件处理单个名为 'image' 的文件】
app.post("/uploadImage", upload.single("image"), async (req, res) => { // <-- Multer 字段名改为 "image"
  const file = req.file; // <-- 修正：从 req.file 获取文件对象
  const { funnelId, outcomeId } = req.body; // <-- 修正：从 req.body 获取文本字段

  // --- 1️⃣ 基础验证 ---
  if (!file || !funnelId || !outcomeId) { // <-- 修正：使用标准的 JS 语法 (if, !, ||)
    console.error("❌ Missing required fields:", {
      hasFile: !!file,
      funnelId,
      outcomeId,
    });
    return res.status(400).send({ error: "Missing required file or form fields." });
  }

  // --- 2️⃣ 文件类型白名单 (保留，并修正语法) ---
  const allowedMimeTypes = [
    "image/png", "image/jpeg", "image/webp", "image/gif",
    "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "application/zip", "application/x-zip-compressed", 
    "application/x-rar-compressed", "video/mp4", "audio/mpeg", "audio/wav"
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) { // <-- 修正：使用标准的 if 语法
    console.warn(`🚫 Blocked unsupported file type: ${file.mimetype}`);
    return res.status(400).send({
      error: `Unsupported file type: ${file.mimetype}`,
      allowed: allowedMimeTypes,
    });
  }

  // --- 3️⃣ 自动分类 (保留，并修正语法) ---
  let folder = "others";
  if (file.mimetype.startsWith("image/")) folder = "images";
  else if (file.mimetype.startsWith("video/")) folder = "videos";
  else if (file.mimetype.startsWith("audio/")) folder = "audio";
  else if (file.mimetype.includes("pdf") || file.mimetype.includes("word") || file.mimetype.includes("excel"))
    folder = "docs";
  else if (file.mimetype.includes("zip") || file.mimetype.includes("rar"))
    folder = "archives";

  // --- 4️⃣ 自动重命名 (修正语法) ---
  const timestamp = Date.now(); // <-- 修正：const
  const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : '';
  const safeFileName = ext
    ? `${timestamp}-${file.originalname.replace(/[^\w.-]/g, '_')}`
    : `${timestamp}-${file.originalname}`; // <-- 修正：三元运算符和模板字符串

  // --- 5️⃣ 构造路径 ---
  const filePath = `uploads/${folder}/${funnelId}/${outcomeId}/${safeFileName}`; // <-- 修正：使用英文变量 filePath
  const storageFile = bucket.file(filePath); // <-- 修正：使用英文变量 storageFile

  // --- 6️⃣ 上传 (修正语法) ---
  try {
    await storageFile.save(file.buffer, { // <-- 修正：await/save/buffer
      metadata: { contentType: file.mimetype },
      public: true,
      predefinedAcl: "publicRead",
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;

    console.log(`✅ Uploaded: ${safeFileName} (${file.mimetype})`);
    console.log(`🌐 URL: ${publicUrl}`);

    // --- 7️⃣ 返回结果 (修正语法) ---
    res.status(200).send({
      data: {
        url: publicUrl, // <-- 修正：使用 url
        name: safeFileName,
        type: file.mimetype,
        size: file.size,
        folder,
      },
    });
  } catch (error) { // <-- 修正：catch 语法
    console.error("❌ File Upload Failed:", error);
    res.status(500).send({ error: "Failed to upload file to Storage." });
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

// --- 启动服务器 ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 track-click API Server listening on port ${PORT}`);
});
