FROM node:20-alpine
#hhhh
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . . 
#EXPOSE 5000
EXPOSE 5000

CMD ["node", "server.js"]