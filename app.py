import streamlit as st

from retriever import load_documents, search_documents

st.set_page_config(
    page_title="AegisAI",
    page_icon="🔎",
    layout="wide"
)

st.title("AegisAI — Evidence Investigator")
st.caption("Prototype v0.1: document retrieval")

documents = load_documents()

st.write(f"Loaded {len(documents)} documents.")

question = st.text_input(
    "What would you like to investigate?"
)

if st.button("Investigate"):
    if not question.strip():
        st.warning("Please enter a question.")
    else:
        results = search_documents(
            question,
            documents,
            top_k=3
        )

        if not results:
            st.warning("No matching evidence found.")

        for result in results:
            st.subheader(result["source"])
            st.write(result["text"])
            st.caption(
                f"Similarity: {result['score']:.3f}"
            )