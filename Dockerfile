FROM node:lts-slim
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

RUN npm install --production && mv node_modules ../
COPY . .
CMD ["node", "main.js"]
