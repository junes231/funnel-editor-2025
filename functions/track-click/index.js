// Console.log("⚡ track-click API Server starting...");

const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

// --- Firebase 初始化 ---
// 修正存储桶名称
const BUCKET_NAME = 'funnel-editor-netlify.firebasestorage.app'; 

if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: BUCKET_NAME
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket(BUCKET_NAME); 
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

function getFilePathFromUrl(fileUrl, bucketName) {
    if (!fileUrl || typeof fileUrl !== 'string') return null;

    try {
        const url = new URL(fileUrl);
        const path = url.pathname;
        
        // 1. 處理 GCS 公共 URL 格式: /BUCKET_NAME/uploads/...
        if (url.hostname === 'storage.googleapis.com' && path.includes(bucketName)) {
            const pathParts = path.split('/');
            const bucketIndex = pathParts.indexOf(bucketName);
            if (bucketIndex !== -1) {
                return pathParts.slice(bucketIndex + 1).join('/');
            }
        }
        
        // 2. 處理 Firebase Long-Lived Token URL 格式: /v0/b/BUCKET_NAME/o/path%2Fto%2Ffile
        if (url.hostname.includes('firebasestorage.googleapis.com') && path.startsWith(`/v0/b/${bucketName}/o/`)) {
            // 提取出 'o/' 後面的部分
            let encodedPath = path.substring(`/v0/b/${bucketName}/o/`.length);
            
            // 確保路徑被 URL 解碼 (例如將 %2F 轉回 /)
            let decodedPath = decodeURIComponent(encodedPath);
            
            return decodedPath;
        }

    } catch (e) {
        console.error("Error during URL parsing:", e);
        return null;
    }

    return null;
}
// --- 生成预签名上传 URL ---
App.post("/generateUploadUrl", async (req, res) => {
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
  
  // ⭐ 關鍵：這是 GCS 中的唯一路徑，將用於前端獲取永久 URL 和後端刪除 ⭐
  const filePath = `uploads/${folder}/${funnelId}/${outcomeId}/${safeFileName}`;
  const file = bucket.file(filePath);

  try {
    // 生成預簽名 URL (用於前端 PUT 請求)
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 10 * 60 * 1000, // 10 分鐘有效
      contentType: fileType,
      virtualHostedStyle: false,
      region: 'us-central1',
    });
    
    // 構造最終文件的公共 URL (此行移除，交由前端處理)
    // const publicFileUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // 🧠 關鍵調試日誌
    console.log("✅ Signed URL generated for:", fileName);
    console.log("🔑 File path for permanent URL generation:", filePath);
    console.log("📤 uploadUrl preview:", uploadUrl.substring(0, 120) + "...");

    // ⭐ 修改點：返回 filePath 而不是 fileUrl ⭐
    res.status(200).send({
      data: {
        uploadUrl: String(uploadUrl),
        filePath: filePath // 將 GCS 檔案路徑返回給前端
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

// ⭐ 修复: 路径解析导致 500 错误的 /deleteFile 路由 ⭐
app.post("/deleteFile", async (req, res) => {
    
    // 假設 `getFilePathFromUrl` 函數已定義在某處，並且現在支持解析長效 Token URL。

    // ... (身份驗證邏輯保持不變) ...
    const idToken = req.headers.authorization?.split('Bearer ')[1]; 
    if (!idToken) {
        return res.status(401).send({ error: "Authentication token required." });
    }

    try {
        // 驗證 ID Token (Admin SDK 執行)
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid; 
        console.log(`[DELETE] Request verified for user: ${userId}`);

        // --- 2. 獲取數據和基礎檢查 ---
        const { fileUrl } = req.body.data || {};
        if (!fileUrl) {
            return res.status(400).send({ error: "Missing fileUrl in request body." });
        }

        // --- 3. 解析路徑和執行刪除 ---
        // ⭐ 核心修改：確保這個函數能處理兩種 URL 格式 ⭐
        const filePath = getFilePathFromUrl(fileUrl, BUCKET_NAME);
        
        if (!filePath) {
            console.warn(`[DELETE] Invalid URL format received for deletion: ${fileUrl}`);
            return res.status(400).send({ error: "Invalid file URL format received." });
        }

        const file = bucket.file(filePath);
        await file.delete();

        console.log(`✅ File deleted successfully: ${filePath}`);

        res.status(200).send({
            data: { success: true }
        });
        
    } catch (error) {
        // ... (錯誤處理邏輯保持不變) ...
        if (error.code === 404) {
            console.warn(`⚠️ File not found in Storage, treating as deleted.`);
            return res.status(200).send({ data: { success: true, message: 'File already missing.' } });
        }
        
        if (error.code === 'auth/argument-error' || String(error).includes('Firebase ID token has expired')) {
             return res.status(401).send({ error: "Invalid or expired authentication token." });
        }

        console.error("❌ Failed to delete file:", error);
        res.status(500).send({ 
            error: "Failed to delete file from Storage.", 
            details: error.message || String(error) 
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

