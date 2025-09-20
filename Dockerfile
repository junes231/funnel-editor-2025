FROM node:20

WORKDIR /app

# 只复制必要文件
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

RUN npm install -g serve

EXPOSE 8080

# 使用 Cloud Run 提供的 $PORT，而不是写死 8080
CMD ["sh", "-c", "serve -s build -l $PORT"]
