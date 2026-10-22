
import os
import requests


def reconstruct_abstract(inverted_index):
    """
    Convert OpenAlex's abstract inverted index
    into readable text.
    """
    if not inverted_index:
        return None

    word_positions = []

    for word, positions in inverted_index.items():
        for position in positions:
            word_positions.append((position, word))

    word_positions.sort(key=lambda item: item[0])

    abstract = " ".join(
        word for position, word in word_positions
    )

    return abstract


def search_research(topic, limit=5):
    url = "https://api.openalex.org/works"

    params = {
        "search": topic,
        "per_page": limit,
    }

    # Read the API key from an environment variable
    api_key = os.getenv("OPENALEX_API_KEY")

    if api_key:
        params["api_key"] = api_key

    try:
        response = requests.get(
            url,
            params=params,
            timeout=20
        )

        response.raise_for_status()

        data = response.json()
        papers = []

        for paper in data.get("results", []):

            # Extract author names
            authors = []

            for authorship in paper.get("authorships", []):
                author = authorship.get("author") or {}
                name = author.get("display_name")

                if name:
                    authors.append(name)

            # Reconstruct abstract
            abstract = reconstruct_abstract(
                paper.get("abstract_inverted_index")
            )

            # Extract publication source
            primary_location = (
                paper.get("primary_location") or {}
            )

            source = (
                primary_location.get("source") or {}
            )

            publication = source.get("display_name")

            # Build research paper object
            papers.append({
                "id": paper.get("id"),
                "title": paper.get("title") or "Untitled paper",
                "year": paper.get("publication_year"),
                "authors": authors,
                "abstract": abstract,
                "citation_count": paper.get(
                    "cited_by_count", 0
                ),
                "publication": publication,
            })

        return papers

    except (requests.exceptions.RequestException, ValueError) as error:
        print(
            f"OpenAlex request failed: {type(error).__name__}: {error}",
            flush=True
        )
        raise RuntimeError(
            "OpenAlex research service is unavailable"
        ) from error


if __name__ == "__main__":

    topic = input("Enter research topic: ")

    results = search_research(topic)

    for paper in results:
        print("\nTitle:", paper["title"])
        print("Year:", paper["year"])
        print("Authors:", ", ".join(paper["authors"]))
        print("Citations:", paper["citation_count"])
        print("Publication:", paper["publication"])
        print("Abstract:", paper["abstract"])
        print("ID:", paper["id"])
        print("-" * 60)
