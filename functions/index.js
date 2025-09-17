const admin = require('firebase-admin');
const functions = require('@google-cloud/functions-framework');

// 初始化 Firebase Admin SDK
admin.initializeApp();

/**
 * 一个安全的 HTTP 云函数，用于给指定 email 的用户授予管理员权限。
 * 它会先验证发起请求的用户本身是否为管理员。
 */
functions.http('grantAdminRole', async (req, res) => {
  // 设置 CORS 跨域请求头，允许您的前端应用调用此函数
  // 注意：为了提高安全性，生产环境中应将 '*' 替换为您的前端域名，例如 'https://your-app-domain.com'
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理浏览器发送的 CORS 预检请求 (preflight request)
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // --- 核心安全检查：验证调用者身份 ---
  // 1. 检查请求头中是否包含 'Authorization' 字段，并且以 'Bearer ' 开头
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    console.error('未在 Authorization 请求头中传递 Firebase ID token。');
    res.status(403).send('Unauthorized'); // 403 禁止访问
    return;
  }

  // 2. 从请求头中提取 ID token
  const idToken = req.headers.authorization.split('Bearer ')[1];

 
  try {
    // 3. 使用 Firebase Admin SDK 验证 ID token 的有效性
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // 4. 授权检查：确认 token 的所有者是否具有管理员角色
    if (decodedToken.role !== 'admin') {
      console.error('调用者不是管理员，权限不足。');
      res.status(403).send('Unauthorized'); // 同样是禁止访问
      return;
    }
  } catch (error) {
    console.error('验证 Firebase ID token 时出错:', error);
    res.status(403).send('Unauthorized');
    return;
  }
  
  // --- 安全检查结束 ---


  // --- 执行核心业务逻辑 (只有在调用者是管理员的情况下才会运行到这里) ---
  
  // 从请求体中获取目标用户的 email
  const email = req.body.data.email;
  if (!email) {
    res.status(400).send({ error: { message: "请求体中必须包含 'data.email' 字段。" } });
    return;
  }

  try {
    // 根据 email 查找用户
    const user = await admin.auth().getUserByEmail(email);
    // 为找到的用户设置自定义声明，赋予其管理员角色
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    // 返回成功信息
    res.status(200).send({ data: { message: `成功！ ${email} 已被设为管理员。` } });
  } catch (error) {
    console.error("设置管理员角色失败:", error);
    res.status(500).send({ error: { message: `内部服务器错误: ${error.message}` } });
  }
});

/**
 * [中文注释] 一个处理点击追踪的 HTTP 云函数
 * 它接收 funnelId, questionId, 和 answerId，然后为对应的答案增加点击次数
 */
functions.http('trackClick', async (req, res) => {
  // [中文注释] CORS 跨域请求头设置 (保持不变)
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // [中文注释] 从请求体中获取必要的 ID (保持不变)
  const { funnelId, questionId, answerId } = req.body.data || {};

  if (!funnelId || !questionId || !answerId) {
    res.status(400).send({ error: 'Missing required fields: funnelId, questionId, answerId' });
    return;
  }

  // --- 这是核心修正逻辑 ---
  try {
    // 1. [中文注释] 获取指向主漏斗文档的引用
    const funnelRef = db.collection('funnels').doc(funnelId);

    // 2. [中文注释] 使用 Firestore 事务来安全地读取和写入数据，避免冲突
    await db.runTransaction(async (transaction) => {
      const funnelDoc = await transaction.get(funnelRef);
      if (!funnelDoc.exists) {
        throw new Error("Funnel document not found!");
      }

      // 3. [中文注释] 从文档中获取当前的数据
      const funnelData = funnelDoc.data();
      const questions = funnelData.data.questions || [];

      // 4. [中文注释] 在 questions 数组中找到需要更新的问题
      let questionFound = false;
      let answerFound = false;
      const updatedQuestions = questions.map(q => {
        if (q.id === questionId) {
          questionFound = true;
          // 5. [中文注释] 在该问题的 answers 数组中找到需要更新的答案
          q.answers = q.answers.map(a => {
            if (a.id === answerId) {
              answerFound = true;
              // 6. [中文注释] 增加 clickCount 字段的值，如果不存在则初始化为 1
              a.clickCount = (a.clickCount || 0) + 1;
            }
            return a;
          });
        }
        return q;
      });

      if (!questionFound || !answerFound) {
        console.error(`Question or Answer not found. Q_ID: ${questionId}, A_ID: ${answerId}`);
        // [中文注释] 即使找不到也不抛出错误，静默失败，避免客户端报错
        return; 
      }
      
      // 7. [中文注释] 用更新后的 questions 数组，更新整个文档
      transaction.update(funnelRef, { 'data.questions': updatedQuestions });
    });

    res.status(200).send({ success: true, message: 'Click tracked successfully.' });

  } catch (error) {
    console.error("Error tracking click:", error);
    res.status(500).send({ error: 'Internal Server Error: ' + error.message });
  }
});
