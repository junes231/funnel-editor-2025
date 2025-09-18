// 文件名: setAdmin.js
const admin = require('firebase-admin');

// --- 请在这里修改为您要设为管理员的邮箱 ---
const adminEmail = "muskjuons@gmail.com"; 
    
// --- 不需要修改下面的内容 ---
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log(`正在查找用户: ${adminEmail}...`);

admin.auth().getUserByEmail(adminEmail)
  .then((user) => {
    console.log(`成功找到用户，UID: ${user.uid}`);
    console.log("正在设置管理员权限...");
    
    return admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
  })
  .then(() => {
    console.log("************************************************************");
    console.log(`✅ 操作成功！用户 ${adminEmail} 现在已经是管理员了。`);
    console.log("请重新登录您的web应用来查看管理员标志。");
    console.log("************************************************************");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 操作失败:", error.message);
    process.exit(1);
  });
