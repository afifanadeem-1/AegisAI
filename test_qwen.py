
import json
import urllib.request

OLLAMA_URL = "http://localhost:11434"

# Automatically find your installed Qwen model
with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=10) as response:
    models = json.load(response)["models"]

qwen_models = [
    model["name"]
    for model in models
    if "qwen" in model["name"].lower()
]

if not qwen_models:
    raise RuntimeError("No Qwen model found in Ollama.")

model_name = qwen_models[0]
print("Using model:", model_name)

payload = {
    "model": model_name,
    "messages": [
        {
            "role": "user",
            "content": "Explain agentic AI in two sentences."
        }
    ],
    "stream": False
}

request = urllib.request.Request(
    f"{OLLAMA_URL}/api/chat",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

with urllib.request.urlopen(request, timeout=180) as response:
    result = json.load(response)

print("\nQwen response:")
print(result["message"]["content"])
