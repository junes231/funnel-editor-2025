const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

async function main() {
  const funnelsSnapshot = await db.collection("funnels").get();

  if (funnelsSnapshot.empty) {
    console.log("没有找到任何 funnel 文档");
    return;
  }

  funnelsSnapshot.forEach(doc => {
    const funnelId = doc.id;
    const questions = doc.data().data?.questions || [];

    questions.forEach(q => {
      const questionId = q.id;
      q.answers.forEach(a => {
        const answerId = a.id;
        // 输出 curl 请求可以直接用的 JSON
        const payload = {
          data: {
            funnelId,
            questionId,
            answerId
          }
        };
        console.log(JSON.stringify(payload, null, 2));
      });
    });
  });
}

main().catch(console.error);
