
from research_tool import research_tool


def aegis_assistant(question):
    question=question.strip()

    if not question:
        return "Please enter a question."
    
    question_lower = question.lower()

    research_keywords = [
        "research",
        "paper",
        "study",
        "academic",
        "journal"
    ]

    if any(word in question_lower for word in research_keywords):
        print("\n[AegisAI] Research tool selected.")

        topic = question
        return research_tool(topic, 5)

    else:
        return (
            "I currently support academic research searches. "
            "Try asking me to find research papers about a topic."
        )


if __name__ == "__main__":
    print("Welcome to AegisAI!")
    print("Type 'exit' to quit.\n")

    while True:
        question = input("You: ").strip()

        if question.lower() == "exit":
            print("AegisAI: Goodbye!")
            break

        if not question:
            print("AegisAI: Please enter a question.")
            continue

        response = aegis_assistant(question)

        print("\nAegisAI:")
        print(response)
