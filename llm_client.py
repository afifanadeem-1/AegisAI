
import os
import requests

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://localhost:11434/api/chat"
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen2.5:3b"
)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

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


def ask_ollama(messages):
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
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
    return data.get("message", {}).get("content", "")


def ask_groq(messages):
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY environment variable is missing"
        )

    payload = {
        "model": os.getenv(
            "GROQ_MODEL",
            "openai/gpt-oss-120b"
        ),
        "messages": messages,
        "temperature": 0.7,
        "max_completion_tokens": 2048
    }

    response = requests.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json=payload,
        timeout=120
    )

    response.raise_for_status()

    data = response.json()
    return data["choices"][0]["message"]["content"]


def ask_llm(messages):
    """
    Main AI interface used by AegisAI.

    AI_PROVIDER=ollama -> Local Ollama
    AI_PROVIDER=groq   -> Cloud Groq
    """

    if not isinstance(messages, list) or not messages:
        raise ValueError(
            "messages must be a non-empty list"
        )

    conversation = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.strip()
        },
        *messages
    ]

    provider = os.getenv(
        "AI_PROVIDER",
        "ollama"
    ).lower()

    if provider == "groq":
        answer = ask_groq(conversation)

    elif provider == "ollama":
        answer = ask_ollama(conversation)

    else:
        raise ValueError(
            f"Unsupported AI provider: {provider}"
        )

    if not isinstance(answer, str) or not answer.strip():
        raise ValueError(
            f"{provider} returned an empty response"
        )

    return answer.strip()


if __name__ == "__main__":
    print("AegisAI - AI Connection Test")

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

        except (
            requests.exceptions.RequestException,
            RuntimeError,
            ValueError,
            KeyError
        ) as error:
            print("\nAI connection error:", error)
