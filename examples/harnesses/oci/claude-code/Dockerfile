FROM node:22.19.0-bookworm-slim
RUN npm install --global --no-audit --no-fund @anthropic-ai/claude-code@2.1.327
USER node
LABEL ai.hexagon.harness.protocol="claude-code-v1" ai.hexagon.harness.version="2.1.327"
ENTRYPOINT ["claude"]
