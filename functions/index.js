const functions = require("firebase-functions");
const admin = require("firebase-admin");

// 初始化 Firebase Admin SDK (这样写更标准)
admin.initializeApp();
const db = admin.firestore();

/**
 * 一个安全的 HTTP 云函数，用于给指定 email 的用户授予管理员权限。
 * 它会先验证发起请求的用户本身是否为管理员。
 */
exports.grantAdminRole = functions.https.onRequest(async (req, res) => {
  // 设置 CORS 跨域请求头
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  // ... (安全检查和核心逻辑保持不变)
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    console.error("未在 Authorization 请求头中传递 Firebase ID token。");
    res.status(403).send("Unauthorized");
    return;
  }
  const idToken = req.headers.authorization.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== "admin") {
      console.error("调用者不是管理员，权限不足。");
      res.status(403).send("Unauthorized");
      return;
    }
  } catch (error) {
    console.error("验证 Firebase ID token 时出错:", error);
    res.status(403).send("Unauthorized");
    return;
  }

  const email = req.body.data.email;
  if (!email) {
    res.status(400).send({ error: { message: "请求体中必须包含 'data.email' 字段。" } });
    return;
  }
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    res.status(200).send({ data: { message: `成功！ ${email} 已被设为管理员。` } });
  } catch (error) {
    console.error("设置管理员角色失败:", error);
    res.status(500).send({ error: { message: `内部服务器错误: ${error.message}` } });
  }
});


/**
 * 一个处理点击追踪的 HTTP 云函数 (使用 Firebase Functions SDK 的最终修正版)
 */
exports.trackClick = functions.https.onRequest(async (req, res) => {
  // 设置 CORS 跨域请求头
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const { funnelId, questionId, answerId } = req.body.data || {};
  if (!funnelId || !questionId || !answerId) {
    res.status(400).send({ error: "Missing required fields: funnelId, questionId, answerId" });
    return;
  }

  try {
    const funnelRef = db.collection("funnels").doc(funnelId);
    await db.runTransaction(async (transaction) => {
      const funnelDoc = await transaction.get(funnelRef);
      if (!funnelDoc.exists) {
        throw new Error("Funnel document not found!");
      }
      const funnelData = funnelDoc.data();
      const questions = funnelData.data.questions || [];
      let questionFound = false;
      let answerFound = false;
      const updatedQuestions = questions.map(q => {
        if (q.id === questionId) {
          questionFound = true;
          q.answers = q.answers.map(a => {
            if (a.id === answerId) {
              answerFound = true;
              a.clickCount = (a.clickCount || 0) + 1;
            }
            return a;
          });
        }
        return q;
      });
      if (!questionFound || !answerFound) {
        console.error(`Question or Answer not found. Q_ID: ${questionId}, A_ID: ${answerId}`);
        return;
      }
      transaction.update(funnelRef, { "data.questions": updatedQuestions });
    });
    res.status(200).send({ success: true, message: "Click tracked successfully." });
  } catch (error) {
    console.error("Error tracking click:", error);
    res.status(500).send({ error: "Internal Server Error: " + error.message });
  }
});
