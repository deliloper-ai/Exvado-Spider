FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY index.js ./
RUN mkdir -p /app/uploadedImages
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "index.js"]
