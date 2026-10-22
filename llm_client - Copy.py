
import os
import requests

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://localhost:11434/api/chat"
)

MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen2.5:3b"
)

SYSTEM_PROMPT = """
You are AegisAI, a helpful AI research assistant.

Your responsibilities:
- Explain academic and technical concepts clearly.
- Help users understand research topics.
- Compare ideas and research methods.
- Provide structured and accurate explanations.
- Admit uncertainty when information is unavailable.
- Never invent academic papers or citations.
- Do not claim to have searched research databases
  unless research results were actually provided.

Be friendly, professional, and educational.
"""


def ask_llm(messages):
    """
    Send conversation history to Ollama.

    messages must be a list of dictionaries:
    [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi!"}
    ]
    """

    if not isinstance(messages, list) or not messages:
        raise ValueError(
            "messages must be a non-empty list"
        )

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT.strip()
            },
            *messages
        ],
        "stream": False,
        "options": {
            "temperature": 0.7
        }
    }

    response = requests.post(
        OLLAMA_URL,
        json=payload,
        timeout=180
    )

    response.raise_for_status()

    data = response.json()

    answer = data.get("message", {}).get(
        "content", ""
    )

    if not isinstance(answer, str) or not answer.strip():
        raise ValueError(
            "Ollama returned an empty response"
        )

    return answer.strip()


if __name__ == "__main__":
    print("AegisAI — Ollama Connection Test")

    question = input("Ask AegisAI: ").strip()

    if not question:
        print("Please enter a question.")

    else:
        messages = [
            {
                "role": "user",
                "content": question
            }
        ]

        try:
            answer = ask_llm(messages)
            print("\nAegisAI:", answer)

        except requests.exceptions.RequestException as error:
            print(
                "\nCould not communicate with Ollama:",
                error
            )

        except ValueError as error:
            print("\nInvalid response:", error)
