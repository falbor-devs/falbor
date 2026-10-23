# Falbor Agent Model

This service runs SmolVLM-500M-Instruct locally and exposes an OpenAI-compatible endpoint for Falbor agents.

## Setup

```bash
cd apps/Agent-Model
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python agent_model.py
```

The service listens on `http://127.0.0.1:8000` by default. Falbor uses this endpoint automatically in development through `http://127.0.0.1:8000/v1`.

Set `FALBOR_LOCAL_AGENT_URL` when the model service runs on another local address. Set `FALBOR_LOCAL_MODEL_ID` to use another compatible vision checkpoint. SmolVLM uses stable CPU float32 by default; set `FALBOR_LOCAL_CPU_DTYPE=bfloat16` only when the host has CPU BF16 support. Set `FALBOR_LOCAL_4BIT=0` to disable 4-bit loading on supported GPU installations.

The model accepts text and image inputs. Browser and MCP execution remain controlled by Falbor's backend tool permissions; the local model selects tools through the same authorized agent runtime as hosted models.
