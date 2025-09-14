const admin = require('firebase-admin');
const functions = require('@google-cloud/functions-framework');

// 初始化 Firebase Admin SDK
admin.initializeApp();

functions.http('grantAdminRole', async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // ---- 已移除所有鉴权逻辑 ----

  // --- 执行核心业务逻辑 (所有人都可访问) ---
  const email = req.body.data?.email;
  if (!email) {
    res.status(400).send({ error: { message: "请求体中必须包含 'data.email' 字段。" } });
    return;
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    res.status(200).send({ data: { message: `成功！ ${email} 已被设为管理员。` } });
  } catch (error) {
    console.error("设置管理员角色失败:", error);
    res.status(500).send({ error: { message: `内部服务器错误: ${error.message}` } });
  }
});
