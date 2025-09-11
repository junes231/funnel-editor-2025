# 使用 Node 官方镜像
FROM node:20

# 设置工作目录
WORKDIR /app

# --- 构建前端 ---
# 复制所有文件并安装所有依赖 (包括 devDependencies)
COPY . .
RUN npm install --legacy-peer-deps
# 运行构建命令，这会生成一个包含前后端所有文件的 build 目录
RUN npm run build

# --- 准备生产环境 ---
# 设置一个新的工作目录用于生产
WORKDIR /app/build

# 只安装生产环境需要的依赖 (这会读取我们复制进来的 package.json)
RUN npm install --omit=dev --legacy-peer-deps

# 暴露端口
EXPOSE 8080

# 启动服务器 (现在 server.js 就在当前目录下)
CMD ["node", "server.js"]
