# 使用 Node 官方镜像
FROM node:20

# 设置工作目录
WORKDIR /app

# --- 构建阶段 ---
# 复制所有文件并安装所有依赖
COPY . .
RUN npm install --legacy-peer-deps
# 运行构建命令，生成包含前后端所有文件的 build 目录
RUN npm run build

# --- 生产阶段 ---
# 设置新的工作目录为 build
WORKDIR /app/build

# 只安装生产环境需要的依赖
RUN npm install --omit=dev --legacy-peer-deps

# 暴露端口
EXPOSE 8080

# 启动服务器 (从 build 目录内部)
CMD ["node", "server.js"]
