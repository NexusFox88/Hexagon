FROM node:22.19.0-bookworm-slim
RUN npm install --global --ignore-scripts --no-audit --no-fund @earendil-works/pi-coding-agent@1.5.2
LABEL ai.hexagon.harness.protocol="pi-v1" ai.hexagon.harness.version="1.5.2"
ENTRYPOINT ["node", "/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js"]
