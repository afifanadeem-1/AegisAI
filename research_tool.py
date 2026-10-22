
from research_search import search_research


def research_tool(query, limit=5):
    papers = search_research(query, limit)

    if not papers:
        return "No research papers found."

    result = f"Research results for: {query}\n\n"

    for index, paper in enumerate(papers, start=1):
        result += f"{index}. {paper['title']}\n"
        result += f"   Year: {paper['year']}\n"
        result += f"   Source: {paper['id']}\n\n"

    return result


if __name__ == "__main__":
    output = research_tool("Agentic AI", 3)
    print(output)
