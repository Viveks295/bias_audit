from abc import ABC, abstractmethod

class Variation(ABC):
    """
    Abstract base class for text variations.
    """
    @abstractmethod
    def apply(self, text: str, magnitude: int) -> str:
        """
        Apply the variation to the input text.

        Args:
            text: Original text.
            magnitude: Integer in [0, 100] controlling variation strength.
        Returns:
            Modified text with variation applied.
        """
        pass
