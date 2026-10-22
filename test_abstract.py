
from research_search import reconstruct_abstract


def test_reconstruct_abstract():
    inverted_index = {
        "Artificial": [0],
        "intelligence": [1],
        "is": [2],
        "evolving": [3],
    }

    result = reconstruct_abstract(inverted_index)

    expected = "Artificial intelligence is evolving"

    assert result == expected

    print("PASS: Abstract reconstructed correctly")


def test_missing_abstract():
    result = reconstruct_abstract(None)

    assert result is None

    print("PASS: Missing abstract handled correctly")


if __name__ == "__main__":
    test_reconstruct_abstract()
    test_missing_abstract()
