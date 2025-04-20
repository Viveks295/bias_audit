from .base import Variation

class PioVariation(Variation):
    """
    Variation that applies 'pio' transformation.
    """
    def apply(self, text: str, magnitude: int) -> str:
        """
        Apply the PIO variation to text.

        Args:
            text: Original text.
            magnitude: Strength of variation (0-100).
        Returns:
            Transformed text.
        """
        # TODO: implement PIO transformation based on magnitude
        substitutions = [
        # Vowel substitutions
        (r'\b(e|E)', 'i'),
        (r'ea', 'e'),
        (r'oo', 'u'),
        (r'au', 'o'),
        (r'ei', 'e'),
        (r'ie', 'i'),

        # Consonant substitutions
        (r'\b[hH]', ''),
        (r'th', 't'),
        (r'v', 'b'),
        (r'z', 's'),
        (r'j', 'y'),
        (r'c([eiy])', r's\1'),
        (r'c', 'k'),
        (r'qu', 'k'),
        # (r'x', 'ks'),
        (r'gn', 'ñ'),

        # Consonant cluster adjustments
        (r'\b(s[ptlrcmn])', r'es\1'),

        # Final consonant adjustments
        # (r'([b-df-hj-np-tv-z])\b', r'\1e'),

        # Double consonants
        (r'([a-zA-Z])\1', r'\1'),

        # Miscellaneous adjustments
        (r'wr', 'r'),
        (r'wh', 'w'),
        (r'kn', 'n'),
        (r'ps', 's'),
        (r'pt', 't'),
        (r'pn', 'n'),
        (r'bt', 't'),
        (r'ct', 't'),
        (r'gh', 'g'),
        (r'ph', 'f'),
        (r'rt', 'r'),
        ]

        def apply_with_probability(match, replacement, prob):
            return replacement if random.random() < prob else match.group(0)

        random.seed()

        total_matches = 0

        for pattern, repl in substitutions:
            matches = list(re.finditer(pattern, text, flags=re.IGNORECASE))
            total_matches += len(matches)

            text = re.sub(
                pattern,
                lambda match: apply_with_probability(match, re.sub(pattern, repl, match.group(0)), error_rate),
                text,
                flags=re.IGNORECASE
            )

        return text
