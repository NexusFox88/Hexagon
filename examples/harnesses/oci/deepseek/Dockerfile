FROM node:24.11.1-bookworm
RUN npm install --global @deepseek-ai/dsh@0.2.2-rc.1 --no-audit --no-fund
ENV DSH_TELEMETRY_DISABLED=1
LABEL ai.hexagon.harness.protocol="deepseek-v1"
ENTRYPOINT ["dsh"]
