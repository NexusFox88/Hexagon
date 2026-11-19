# GUI application accounts → cloud Agent → SDK result

Configure and enable Exa (search), Tavily (search) and DeepL (translate_text) in Console → Agent → Tools. Reuse a verified Sandbox connection and Anthropic-compatible model connection.

Save only public connection IDs in `.local/applications/connections.json`:

```json
{
  "sandbox_connection_id": "YOUR_SANDBOX_CONNECTION_ID",
  "model_connection_id": "YOUR_MODEL_CONNECTION_ID",
  "tools": {
    "exa": "YOUR_EXA_CONNECTION_ID",
    "tavily": "YOUR_TAVILY_CONNECTION_ID",
    "deepl": "YOUR_DEEPL_CONNECTION_ID"
  }
}
```

From the repository root:

```sh
npx tsx examples/applications/run.ts
python3 examples/applications/run.py
```

Run these serially when the Sandbox account has a single-instance quota. They register the example custom Python Harness, create an Agent and Session, invoke real application tools from inside the cloud Agent through the control-plane broker, verify each tool completed and return the model's text through the SDK. They close the Session in `finally`. Run IDs and cleanup evidence are saved under `.local/applications/`.

The examples use the local owner credential in memory, or `HEXAGON_API_TOKEN` and optional `HEXAGON_API_URL`. Application keys remain in control-plane connections; the examples neither read them nor inject them into Sandbox environment variables. Search and model calls may consume provider credits. No messages are sent and no third-party content is modified.
