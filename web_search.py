import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"


def search_web(question, count=5):
    api_key = os.getenv("BRAVE_API_KEY")

    if not api_key:
        raise ValueError("BRAVE_API_KEY is missing.")

    response = requests.get(
        SEARCH_URL,
        headers={
            "X-Subscription-Token": api_key,
            "Accept": "application/json"
        },
        params={
            "q": question,
            "count": count
        },
        timeout=15
    )

    response.raise_for_status()
    data = response.json()

    results = data.get("web", {}).get("results", [])

    return [
        {
            "title": item.get("title", "Untitled"),
            "url": item.get("url", ""),
            "snippet": item.get("description", "")
        }
        for item in results
        if item.get("url")
    ]


def extract_page(url):
    response = requests.get(
        url,
        headers={"User-Agent": "AegisAIResearch/0.1"},
        timeout=15,
        allow_redirects=False
    )
    response.raise_for_status()

    content_type = response.headers.get("Content-Type", "")

    if "text/html" not in content_type.lower():
        raise ValueError("Page is not HTML.")

    soup = BeautifulSoup(response.text, "html.parser")

    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)

    return text[:12000]

if __name__ == "__main__":
    url = "https://example.com"

    text = extract_page(url)

    print(text[:500])