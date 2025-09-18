FROM node:20

WORKDIR /app

COPY . .
RUN npm install --legacy-peer-deps
RUN npm run build

RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", "build", "-l", "8080"]
