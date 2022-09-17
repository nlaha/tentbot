FROM node:lts-slim
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

# install python
RUN apt-get update && apt-get install -y python3 python3-pip

RUN npm install --production && mv node_modules ../
COPY . .
CMD ["node", "main.js"]
