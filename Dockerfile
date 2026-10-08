FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg ca-certificates build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY requirements.txt ./
RUN python3 -m venv /opt/narrator-python && /opt/narrator-python/bin/pip install --no-cache-dir -r requirements.txt
ENV NARRATOR_PYTHON=/opt/narrator-python/bin/python NARRATOR_MODEL_DIR=/opt/narrator-models NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN /opt/narrator-python/bin/python scripts/setup-narration.py && npm run build && npm prune --omit=dev && mkdir -p /data && chown node:node /data
ENV NODE_ENV=production NARRATOR_DATA_DIR=/data
USER node
EXPOSE 3000
CMD ["npm", "run", "start:web"]
