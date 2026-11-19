FROM node:24.16.0-bookworm-slim
COPY --from=python:3.12-slim-bookworm /usr/local /usr/local
RUN npm install --global --no-audit --no-fund openclaw@2026.11.5
LABEL ai.hexagon.harness.protocol="openclaw-v1" ai.hexagon.harness.version="2026.11.5"
ENTRYPOINT ["openclaw"]
