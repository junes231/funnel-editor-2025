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
// 允许 Netlify 和 GitHub Pages 两个特定来源的请求
const allowedOrigins = [
  'https://funnel-editor2025.netlify.app',
  'https://junes231.github.io/funnel-editor-2025/'
];

const corsOptions = {
  origin: function (origin, callback) {
    // 允许没有来源的请求 (例如服务器到服务器的请求)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
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
