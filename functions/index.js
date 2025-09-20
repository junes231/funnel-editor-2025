const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// --- 1. 初始化 ---
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

const app = express();

// --- 2. 中间件设置 ---
app.use(cors({ origin: true }));
app.use(express.json());

// --- 3. 健康检查路由 (Cloud Run 必须有) ---
app.get('/', (req, res) => {
  res.status(200).send("Service is running.");
});

/**
 * 路由: /grantAdminRole
 */
app.post('/grantAdminRole', async (req, res) => {
  if (!req.headers.authorization?.startsWith("Bearer ")) {
    return res.status(403).send("Unauthorized");
  }

  try {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    if (decodedToken.role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const email = req.body.data?.email;
    if (!email) {
      return res.status(400).send({ error: "请求体中必须包含 data.email 字段。" });
    }

    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });

    return res.status(200).send({
      data: { message: `成功！${email} 已被设为管理员。` }
    });

  } catch (error) {
    console.error("处理 grantAdminRole 出错:", error);
    return res.status(500).send({ error: `内部服务器错误: ${error.message}` });
  }
});

/**
 * 路由: /trackClick
 */
app.post('/trackClick', async (req, res) => {
  const { funnelId, questionId, answerId } = req.body.data || {};
  if (!funnelId || !questionId || !answerId) {
    return res.status(400).send({ error: "Missing required fields: funnelId, questionId, answerId" });
  }

  try {
    const funnelRef = db.collection("funnels").doc(funnelId);
    const funnelDoc = await funnelRef.get();

    if (!funnelDoc.exists) {
      return res.status(404).send({ error: "Funnel not found" });
    }

    const funnelData = funnelDoc.data();
    const questions = funnelData.data?.questions || [];
    const questionIndex = questions.findIndex(q => q.id === questionId);

    if (questionIndex === -1) {
      return res.status(404).send({ error: "Question not found" });
    }

    // ✅ 判断 answers 是数组还是对象
    let answerExists = false;
    if (Array.isArray(questions[questionIndex].answers)) {
      answerExists = questions[questionIndex].answers.some(a => a.id === answerId);
    } else if (typeof questions[questionIndex].answers === "object") {
      answerExists = !!questions[questionIndex].answers[answerId];
    }

    if (!answerExists) {
      return res.status(404).send({ error: "Answer not found" });
    }

    // ✅ Firestore 原子计数
    await funnelRef.update({
      [`data.questions.${questionIndex}.answers.${answerId}.clickCount`]:
        admin.firestore.FieldValue.increment(1)
    });

    return res.status(200).send({
      data: { success: true, message: `Click tracked for answer ${answerId}` }
    });

  } catch (error) {
    console.error("Error tracking click:", error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * 路由: /getUserRole
 */
app.get('/getUserRole', async (req, res) => {
  if (!req.headers.authorization?.startsWith("Bearer ")) {
    return res.status(403).send("Unauthorized");
  }

  try {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const role = decodedToken.role || "user";

    return res.status(200).send({ data: { role } });
  } catch (error) {
    console.error("获取用户角色时出错:", error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// --- 4. 服务器启动 ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  try {
    await db.listCollections(); // 测试 Firestore 连接
    console.log("✅ Firestore connection is active.");
  } catch (err) {
    console.error("❌ Firestore connection test failed:", err.message);
  }
});
