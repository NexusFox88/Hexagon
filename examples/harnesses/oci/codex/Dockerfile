FROM node:22.19.0-bookworm-slim
COPY --from=python:3.12-slim-bookworm /usr/local /usr/local
RUN npm install --global --no-audit --no-fund @openai/codex@0.169.0
LABEL ai.hexagon.harness.protocol="codex-v1" ai.hexagon.harness.version="0.169.0"
ENTRYPOINT ["codex"]
