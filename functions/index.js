console.log("⚡ index.js starting...");

const express = require("express");
console.log("✅ Express required");

const admin = require("firebase-admin");
console.log("✅ Firebase Admin required");

const cors = require("cors");
console.log("✅ CORS required");

const path = require("path");
console.log("✅ Path required");
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

// 中间件
app.use(cors({ origin: "*" }));
app.use(express.json());
console.log("✅ Middleware registered");

// --- 4. Admin 验证中间件 ---
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

// --- 5. Route Handlers ---
async function trackClickHandler(req, res) {
  const { funnelId, questionId, answerId } = req.body.data || {};
  if (!funnelId || !questionId || !answerId) {
    return res.status(400).send({ error: "Missing required fields" });
  }

  try {
    const funnelRef = db.collection("funnels").doc(funnelId);
    const funnelDoc = await funnelRef.get();
    if (!funnelDoc.exists) return res.status(404).send({ error: "Funnel not found" });

    const funnelData = funnelDoc.data();
    const questions = funnelData.data?.questions || [];
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return res.status(404).send({ error: "Question not found" });

    const answers = questions[questionIndex].answers;
    if (!answers || !answers[answerId]) return res.status(404).send({ error: "Answer not found" });

    const path = `data.questions.${questionIndex}.answers.${answerId}.clickCount`;
    await funnelRef.update({ [path]: admin.firestore.FieldValue.increment(1) });

    res.status(200).send({ data: { success: true, message: `Click tracked for answer ${answerId}` } });
  } catch (err) {
    console.error("❌ Error tracking click:", err);
    res.status(500).send({ error: "Internal server error" });
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

// --- 6. 路由定义（顺序非常重要） ---

// 公开路由
app.post("/trackClick", trackClickHandler);

// 需要管理员验证的路由
app.post("/grantAdminRole", verifyAdmin, grantAdminRoleHandler);

// 获取角色，可以公开
app.get("/getUserRole", getUserRoleHandler);

// 静态文件放最后
app.use(express.static(path.join(__dirname, "../build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

// --- 7. 启动服务器 ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log("✅ Firestore connection is active.");
});
