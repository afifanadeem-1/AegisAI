
import requests

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "qwen2.5:3b"


def ask_ollama(message):
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are AegisAI, a helpful AI research "
                    "assistant. Explain concepts clearly, "
                    "accurately, and in a beginner-friendly way."
                )
            },
            {
                "role": "user",
                "content": message
            }
        ],
        "stream": False
    }

    try:
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=180
        )

        response.raise_for_status()

        data = response.json()

        return data["message"]["content"]

    except requests.exceptions.RequestException as error:
        raise RuntimeError(
            f"Unable to communicate with Ollama: {error}"
        ) from error
