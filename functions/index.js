const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// --- 1. 初始化 Firebase ---
let db;
try {
  if (!admin.apps.length) {
    admin.initializeApp();
    console.log("✅ Firebase Admin SDK initialized successfully.");
  }
  db = admin.firestore();
} catch (e) {
  console.error("❌ Firebase Admin SDK initialization failed:", e);
}

// --- 2. 创建 Express ---
const app = express();

// --- 3. 中间件 ---
app.use(cors({ origin: true }));
app.use(express.json());

// --- 4. 健康检查路由 ---
app.get('/', (req, res) => {
  res.status(200).send("Service is running.");
});

// --- 5. Admin 验证中间件 ---
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(403).send("Unauthorized");

  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== "admin") return res.status(403).send("Unauthorized");
    next();
  } catch (err) {
    console.error("Admin verification failed:", err);
    res.status(403).send("Unauthorized");
  }
}

// --- 6. 路由: /grantAdminRole ---
app.post('/grantAdminRole', verifyAdmin, async (req, res) => {
  const email = req.body.data?.email;
  if (!email) return res.status(400).send({ error: "Missing data.email" });

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    res.status(200).send({ data: { message: `${email} is now admin` } });
  } catch (err) {
    console.error("Error granting admin role:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

// --- 7. 路由: /trackClick ---
app.post('/trackClick', async (req, res) => {
  const { funnelId, questionId, answerId } = req.body.data || {};
  if (!funnelId || !questionId || !answerId) {
    return res.status(400).send({ error: "Missing required fields: funnelId, questionId, answerId" });
  }

  try {
    const funnelRef = db.collection("funnels").doc(funnelId);
    const funnelDoc = await funnelRef.get();
    if (!funnelDoc.exists) return res.status(404).send({ error: "Funnel not found" });

    const funnelData = funnelDoc.data();
    const questions = funnelData.data?.questions || [];
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return res.status(404).send({ error: "Question not found" });

    let answerExists = false;
    if (Array.isArray(questions[questionIndex].answers)) {
      answerExists = questions[questionIndex].answers.some(a => a.id === answerId);
    } else if (typeof questions[questionIndex].answers === "object") {
      answerExists = !!questions[questionIndex].answers[answerId];
    }

    if (!answerExists) return res.status(404).send({ error: "Answer not found" });

    // Firestore 原子计数
    await funnelRef.update({
      [`data.questions.${questionIndex}.answers.${answerId}.clickCount`]: 
        admin.firestore.FieldValue.increment(1)
    });

    res.status(200).send({ data: { success: true, message: `Click tracked for answer ${answerId}` } });

  } catch (err) {
    console.error("Error tracking click:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

// --- 8. 路由: /getUserRole ---
app.get('/getUserRole', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(403).send("Unauthorized");

  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const role = decodedToken.role || "user";
    res.status(200).send({ data: { role } });
  } catch (err) {
    console.error("Error getting user role:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

// --- 9. 启动服务器 ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  if (!db) {
    console.warn("❌ Firestore connection not active. API calls will fail.");
  } else {
    console.log("✅ Firestore connection is active.");
  }
});
