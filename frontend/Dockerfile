# ---------- Frontend Dockerfile ----------

FROM node:20-alpine

WORKDIR /app

# Copy package files first for efficient caching
COPY frontend/package*.json ./

RUN npm install

# Copy the rest of the code
COPY frontend .

# Expose frontend dev port (change if not using 5173)
EXPOSE 5173

# Start the app
CMD ["npm", "run", "dev"]
