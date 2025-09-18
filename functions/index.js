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
// 在现有的 trackClick 函数中补充完整逻辑
exports.trackClick = functions.https.onRequest(async (req, res) => {
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
    const funnelDoc = await funnelRef.get();
    
    if (!funnelDoc.exists) {
      res.status(404).send({ error: "Funnel not found" });
      return;
    }

    const funnelData = funnelDoc.data();
    const questions = funnelData.data.questions || [];
    
    // 找到对应的问题和答案
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) {
      res.status(404).send({ error: "Question not found" });
      return;
    }
    
    const answerIndex = questions[questionIndex].answers.findIndex(a => a.id === answerId);
    if (answerIndex === -1) {
      res.status(404).send({ error: "Answer not found" });
      return;
    }
    
    // 更新点击次数
    const currentCount = questions[questionIndex].answers[answerIndex].clickCount || 0;
    questions[questionIndex].answers[answerIndex].clickCount = currentCount + 1;
    
    // 保存更新后的数据
    await funnelRef.update({
      'data.questions': questions
    });
    
    res.status(200).send({ 
      data: { 
        success: true, 
        newClickCount: questions[questionIndex].answers[answerIndex].clickCount 
      } 
    });
    
  } catch (error) {
    console.error("Error tracking click:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});
