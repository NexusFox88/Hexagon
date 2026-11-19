FROM python:3.12-slim-bookworm
RUN apt-get -o Acquire::Retries=3 update && apt-get -o Acquire::Retries=3 install -y --no-install-recommends git curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch v2026.9.24 https://github.com/NousResearch/hermes-agent.git /opt/hermes && cd /opt/hermes && git checkout f97608f178d1ffeca59860195ab7da295f7c8e5f
RUN pip install --no-cache-dir -e /opt/hermes
RUN pip install --no-cache-dir mcp==2.0.0 httpx2==2.7.0 starlette==1.3.1
LABEL ai.hexagon.harness.protocol="hermes-v1" ai.hexagon.harness.version="2026.9.24"
ENTRYPOINT ["hermes"]
