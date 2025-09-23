console.log("⚡ grant-admin-role API Server starting...");

const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

// --- Firebase 初始化 ---
if (!admin.apps.length) {
  admin.initializeApp();
}

// --- Express 应用创建 ---
const app = express();

// --- CORS 中间件 ---
const allowedOrigins = [
  'https://funnel-editor2025.netlify.app',
  'https://junes231.github.io/funnel-editor-2025/'
];

const corsOptions = {
  origin: function (origin, callback) {
    // 允许没有来源的请求 (例如服务器到服务器的请求)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: "GET,POST,OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
};
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

// --- Admin 验证中间件 ---
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(403).send("Unauthorized");
  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== "admin") return res.status(403).send("Unauthorized");
    next();
  } catch (err) {
    console.error("❌ Admin verification failed:", err);
    res.status(403).send("Unauthorized");
  }
}

// --- Route Handlers ---
async function grantAdminRoleHandler(req, res) {
  const email = req.body.data?.email;
  if (!email) return res.status(400).send({ error: "Missing data.email" });
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    res.status(200).send({ data: { message: `${email} is now admin` } });
  } catch (err) {
    console.error("❌ Error granting admin role:", err);
    res.status(500).send({ error: "Internal server error" });
  }
}

async function getUserRoleHandler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(403).send("Unauthorized");
  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const role = decodedToken.role || "user";
    res.status(200).send({ data: { role } });
  } catch (err) {
    console.error("❌ Error getting user role:", err);
    res.status(500).send({ error: "Internal server error" });
  }
}

// --- 路由定义 ---
app.post("/grantAdminRole", verifyAdmin, grantAdminRoleHandler);
app.get("/getUserRole", getUserRoleHandler);

// --- 启动服务器 ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 grant-admin-role API Server listening on port ${PORT}`);
});
