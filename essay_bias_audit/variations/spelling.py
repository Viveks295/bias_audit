import random
from .base import Variation

class SpellingVariation(Variation):
    """
    Variation that introduces spelling errors into text.
    """
    def apply(self, text: str, magnitude: int) -> str:
        """
        Introduce spelling errors into the text.

        Args:
            text: Original text.
            magnitude: % of characters to perturb (0-100).
        Returns:
            Text with spelling errors.
        """
        error_rate = magnitude / 100.0
        words = text.split()
        num_errors = int(len(words) * error_rate)
        error_indices = random.sample(range(len(words)), num_errors)

        def misspell_word(word):
            if len(word) <= 1:  
                return word
            error_type = random.choice(["swap", "replace", "delete", "insert"])
            if error_type == "swap" and len(word) > 1:
                i = random.randint(0, len(word) - 2)
                return word[:i] + word[i+1] + word[i] + word[i+2:]
            elif error_type == "replace":
                i = random.randint(0, len(word) - 1)
                char = random.choice("abcdefghijklmnopqrstuvwxyz")
                return word[:i] + char + word[i+1:]
            elif error_type == "delete":
                i = random.randint(0, len(word) - 1)
                return word[:i] + word[i+1:]
            elif error_type == "insert":
                i = random.randint(0, len(word))
                char = random.choice("abcdefghijklmnopqrstuvwxyz")
                return word[:i] + char + word[i:]
            return word

        misspelled_words = [
            misspell_word(word) if i in error_indices else word for i, word in enumerate(words)
        ]
        return " ".join(misspelled_words)
