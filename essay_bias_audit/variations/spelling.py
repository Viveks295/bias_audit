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
        # TODO: implement spelling perturbation based on magnitude
        return text