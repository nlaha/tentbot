FROM node:12.18-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

RUN apt-get update || : && apt-get install python -y
RUN apt-get install ffmpeg -y

RUN npm install --production --silent && mv node_modules ../
COPY . .
CMD ["node", "main.js"]
