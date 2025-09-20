// 文件路径: 您的 Cloud Run 服务的主文件 (例如 index.js)

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// --- 1. 初始化 ---
// 初始化 Firebase Admin SDK
try {
  admin.initializeApp();
} catch (e) {
  // 如果已经初始化，则忽略错误
}
const db = admin.firestore();
const app = express();


// --- 2. 中间件设置 ---
// 允许所有来源的跨域请求
app.use(cors({ origin: true }));
// 允许 Express 解析 JSON 格式的请求体
app.use(express.json());


// --- 3. 路由定义 (将您的两个功能转换为两个路由) ---

/**
 * 路由: /grantAdminRole
 * 功能: 给指定 email 的用户授予管理员权限。
 */
app.post('/grantAdminRole', async (req, res) => {
  // 安全检查和核心逻辑与您之前的 Cloud Function 版本完全相同
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    console.error("未在 Authorization 请求头中传递 Firebase ID token。");
    return res.status(403).send("Unauthorized");
  }
  try {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== "admin") {
      console.error("调用者不是管理员，权限不足。");
      return res.status(403).send("Unauthorized");
    }
  } catch (error) {
    console.error("验证 Firebase ID token 时出错:", error);
    return res.status(403).send("Unauthorized");
  }

  const email = req.body.data?.email;
  if (!email) {
    return res.status(400).send({ error: { message: "请求体中必须包含 'data.email' 字段。" } });
  }
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    return res.status(200).send({ data: { message: `成功！ ${email} 已被设为管理员。` } });
  } catch (error) {
    console.error("设置管理员角色失败:", error);
    return res.status(500).send({ error: { message: `内部服务器错误: ${error.message}` } });
  }
});


/**
 * 路由: /trackClick
 * 功能: 处理点击追踪，已修正为支持对象格式的答案。
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

    // --- [核心修复] ---
    // 1. 直接检查答案对象中是否存在 answerId 这个键
    if (!questions[questionIndex].answers || !questions[questionIndex].answers[answerId]) {
      return res.status(404).send({ error: "Answer not found" });
    }
    
    // 2. 直接通过键来更新点击次数
    const currentCount = questions[questionIndex].answers[answerId].clickCount || 0;
    questions[questionIndex].answers[answerId].clickCount = currentCount + 1;
    
    await funnelRef.update({
      'data.questions': questions
    });
    
    return res.status(200).send({ 
      data: { 
        success: true, 
        newClickCount: questions[questionIndex].answers[answerId].clickCount 
      } 
    });
    
  } catch (error) {
    console.error("Error tracking click:", error);
    return res.status(500).send({ error: "Internal server error" });
  }
});


// --- 4. 服务器启动 ---
// Cloud Run 会通过 PORT 环境变量告诉您的服务要监听哪个端口
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log('Registered routes:');
  console.log('POST /grantAdminRole');
  console.log('POST /trackClick');
});
