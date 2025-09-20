// 引入所需的npm包
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// --- 1. 初始化 ---
// 初始化 Firebase Admin SDK 和 Express 应用
// 这种写法可以防止在某些环境下重复初始化
try {
  admin.initializeApp();
} catch (e) {
  console.log('Firebase Admin SDK a经初始化。');
}
const db = admin.firestore();
const app = express();


// --- 2. 中间件设置 ---
// 允许所有来源的跨域请求 (CORS)
app.use(cors({ origin: true }));
// 允许 Express 解析 JSON 格式的请求体
app.use(express.json());


// --- 3. 路由定义 ---

/**
 * 路由: /grantAdminRole
 * 功能: 给指定 email 的用户授予管理员权限。
 */
app.post('/grantAdminRole', async (req, res) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    console.error("未在 Authorization 请求头中传递 Firebase ID token。");
    return res.status(403).send("Unauthorized");
  }

  try {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // ✅ 使用 Firebase Custom Claims 验证
    if (!decodedToken.role || decodedToken.role !== "admin") {
      console.error("调用者不是管理员，权限不足。");
      return res.status(403).send("Unauthorized");
    }

    const email = req.body.data?.email;
    if (!email) {
      return res.status(400).send({ error: { message: "请求体中必须包含 'data.email' 字段。" } });
    }

    const user = await admin.auth().getUserByEmail(email);

    // ✅ 设置自定义角色
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });

    return res.status(200).send({
      data: { message: `成功！ ${email} 已被设为管理员。` }
    });

  } catch (error) {
    console.error("处理 grantAdminRole 出错:", error);
    return res.status(500).send({ error: { message: `内部服务器错误: ${error.message}` } });
  }
});

/**
 * 路由: /trackClick
 * 功能: 处理点击追踪，采用 Firestore 原子 increment(1) 更新
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

    // 检查是否有对应的 answer
    if (!questions[questionIndex].answers || !questions[questionIndex].answers[answerId]) {
      return res.status(404).send({ error: "Answer not found" });
    }

    // 🔥 使用 Firestore 原子计数器，避免并发覆盖
    await funnelRef.update({
      [`data.questions.${questionIndex}.answers.${answerId}.clickCount`]: admin.firestore.FieldValue.increment(1)
    });

    return res.status(200).send({ 
      data: { 
        success: true, 
        message: `Click tracked for answer ${answerId} of question ${questionId}`
      } 
    });
    
  } catch (error) {
    console.error("Error tracking click:", error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * 路由: /getUserRole
 * 功能: 返回当前用户的角色（从 Firebase Custom Claims 里读取）
 */
app.get('/getUserRole', async (req, res) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    console.error("未在 Authorization 请求头中传递 Firebase ID token。");
    return res.status(403).send("Unauthorized");
  }

  try {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // ✅ 从 Custom Claims 中读取 role
    const role = decodedToken.role || "user";

    return res.status(200).send({ data: { role } });
  } catch (error) {
    console.error("获取用户角色时出错:", error);
    return res.status(500).send({ error: "Internal server error" });
  }
});


// --- 4. 服务器启动 ---
// Cloud Run 会通过 PORT 环境变量告诉您的服务要监听哪个端口
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log('Registered routes:');
  console.log('  - POST /grantAdminRole');
  console.log('  - POST /trackClick');
  console.log('  - GET  /getUserRole');
});
