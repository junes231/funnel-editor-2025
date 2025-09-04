const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 8080;

// 允许前端 Netlify 访问
app.use(cors({
  origin: "https://funnel-editor2025.netlify.app",
  credentials: true
}));

app.use(express.json());

// 示例登录 API
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if(email === "test@example.com" && password === "123456") {
    res.json({ success: true, message: "Login successful" });
  } else {
    res.status(401).json({ success: false, message: "Incorrect account or password" });
  }
});

app.listen(port, () => console.log(`Cloud Run backend running on port ${port}`));
