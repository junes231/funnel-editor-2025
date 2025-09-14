FROM node:20

WORKDIR /app

# 构建前端
COPY . .
RUN npm install --legacy-peer-deps
RUN npm run build

# 安装 serve 静态服务器
RUN npm install -g serve

# 暴露端口 8080（Cloud Run 要求）
EXPOSE 8080

# 用 serve 启动 build 目录
CMD ["serve", "-s", "build", "-l", "8080"]
