// 文件路径: functions/trackClick.js

const admin = require('firebase-admin');
const functions = require('@google-cloud/functions-framework');

// [中文注释] 如果应用未初始化，则进行初始化
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * [中文注释] 一个处理点击追踪的 HTTP 云函数
 * 它接收 funnelId, questionId, 和 answerId，然后为对应的答案增加点击次数
 */
functions.http('trackClick', async (req, res) => {
  // [中文注释] 设置 CORS 跨域请求头，允许您的前端应用调用
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // [中文注释] 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // [中文注释] 确保请求方法是 POST
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // [中文注释] 从请求体中获取必要的 ID
  const { funnelId, questionId, answerId } = req.body.data || {};

  if (!funnelId || !questionId || !answerId) {
    res.status(400).send({ error: 'Missing required fields: funnelId, questionId, answerId' });
    return;
  }

  try {
    // [中文注释] 构建指向特定答案的 Firestore 文档引用
    // [中文注释] 注意：这个路径假设您的数据结构是 funnels -> questions -> answers
    // [中文注释] 我们稍后会在前端代码中确保这个结构
    const answerRef = db.collection('funnels').doc(funnelId)
                        .collection('questions').doc(questionId)
                        .collection('answers').doc(answerId);

    // [中文注释] 使用原子性的 increment 操作来增加 clickCount 字段的值
    await answerRef.update({
      clickCount: admin.firestore.FieldValue.increment(1)
    });

    res.status(200).send({ success: true, message: 'Click tracked successfully.' });

  } catch (error) {
    console.error("Error tracking click:", error);
    // [中文注释] 如果文档或字段不存在，尝试创建它并设置点击为1
    if (error.code === 5) { // 'NOT_FOUND' error code
        try {
            const answerRef = db.collection('funnels').doc(funnelId)
                                .collection('questions').doc(questionId)
                                .collection('answers').doc(answerId);
            await answerRef.set({ clickCount: 1 }, { merge: true });
            res.status(200).send({ success: true, message: 'Click tracked and document created.' });
        } catch (set_error) {
            console.error("Error creating document for click tracking:", set_error);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    } else {
        res.status(500).send({ error: 'Internal Server Error' });
    }
  }
});
