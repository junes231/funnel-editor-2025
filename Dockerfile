# 使用 Node 官方镜像
FROM node:20

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装
COPY package*.json ./
RUN npm install --legacy-peer-deps

# 复制项目源代码
COPY . .

# 构建 React 前端
RUN npm run build

# 启动 Express
CMD ["node", "server.js"]
