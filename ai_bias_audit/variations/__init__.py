"""
Variations package: define and register text variations for auditing.
"""
from .base import Variation
from .spelling import SpellingVariation
from .pio import PioVariation
from .cognates import CognatesVariation
from .noun_transfer import NounTransferVariation
from .spanglish import SpanglishVariation

_VARIATIONS = {
    'spelling': SpellingVariation(),
    'pio': PioVariation(),
    'cognates': CognatesVariation(),
    'noun_transfer': NounTransferVariation(),
    'spanglish': SpanglishVariation(),
}

def get_variation(name: str) -> Variation:
    """
    Retrieve a variation instance by name.

    Args:
        name: Variation name.
    Returns:
        Variation instance.
    Raises:
        ValueError if name is unknown.
    """
    try:
        return _VARIATIONS[name]
    except KeyError:
        raise ValueError(f"Unknown variation: {name}")