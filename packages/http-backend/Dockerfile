FROM node:12-alpine3.10
RUN apk add python make gcc g++ git

ENV DEBUG='flipstarter:status, flipstarter:server'

ENV FLIPSTARTER_API_AUTH="pending-contributions"
ENV FLIPSTARTER_IPFS_GATEWAY_URL="https://ipfs.io"

WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
CMD ["npm", "start"]
