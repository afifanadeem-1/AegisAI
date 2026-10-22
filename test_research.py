
from research_search import search_research

results = search_research("Machine Learning", 3)

assert isinstance(results, list)
assert len(results) == 3

for paper in results:
    assert "title" in paper
    assert "year" in paper
    assert "id" in paper

print("All research search tests passed!")
