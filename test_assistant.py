
import unittest
from unittest.mock import patch

from assistant import aegis_assistant


class TestAegisAssistant(unittest.TestCase):

    @patch("assistant.research_tool")
    def test_research_question(self, mock_tool):
        mock_tool.return_value = "Found research papers"

        result = aegis_assistant(
            "Find research papers about cybersecurity"
        )

        mock_tool.assert_called_once()
        self.assertEqual(result, "Found research papers")

    @patch("assistant.research_tool")
    def test_general_question(self, mock_tool):
        result = aegis_assistant("What is Python?")

        self.assertIn("academic research", result)
        mock_tool.assert_not_called()

    @patch("assistant.research_tool")
    def test_empty_question(self, mock_tool):
        result = aegis_assistant("   ")

        self.assertEqual(result, "Please enter a question.")
        mock_tool.assert_not_called()


if __name__ == "__main__":
    unittest.main()
