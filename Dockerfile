FROM node:20

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --legacy-peer-deps

# 复制项目文件
COPY . .

# 构建前端
RUN npm run build

# 暴露 Cloud Run 默认端口
EXPOSE 8080

# 启动 Express 后端，后端中会处理 /trackClick、/grantAdminRole，并可提供 build 静态文件
CMD ["node", "functions/index.js"]
