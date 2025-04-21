import random
import difflib
import nltk
from deep_translator import GoogleTranslator
from .base import Variation

# Cache for translations
cognate_cache = {}

# Translator instance (uses free Google Translate)
translator = GoogleTranslator(source='auto', target='es')

class CognatesVariation(Variation):
    """
    Variation that replaces words with their cognates.
    """
    def apply(self, text: str, magnitude: int) -> str:
        """
        Replace words with cognates based on magnitude.

        Args:
            text: Original text.
            magnitude: % of words to replace (0-100).
        Returns:
            Text with cognate replacements.
        """
        # Error rate from magnitude (0-100)
        error_rate = magnitude / 100.0
        # TODO: implement cognate replacements based on magnitude
        def translate_word(word):
            # Use deep-translator Google Translate under the hood
            return translator.translate(word)

        def is_cognate(eng_word, esp_word, threshold=0.7):
            """
            Determines if the English word and its Spanish translation are cognates,
            based on a similarity threshold.
            """
            return difflib.SequenceMatcher(None, eng_word.lower(), esp_word.lower()).ratio() >= threshold

        """
        Translates a percentage (error_rate) of words in the text that are likely cognates.
        Every token that is alphabetic is considered a candidate.
        Uses caching to avoid repeated translations and cognate checks.
        """
        tokens = nltk.word_tokenize(text)
        candidate_indices = []
        candidate_translations = {}

        for index, token in enumerate(tokens):
            # Only consider alphabetic tokens.
            if token.isalpha():
                # Check cache first.
                if token in cognate_cache:
                    translation, is_candidate = cognate_cache[token]
                else:
                    try:
                        translation = translate_word(token)
                        is_candidate = is_cognate(token, translation)
                        cognate_cache[token] = (translation, is_candidate)
                    except Exception as e:
                        print(f"Error translating '{token}': {e}")
                        continue  # Skip this token if an error occurs.

                if is_candidate:
                    candidate_indices.append(index)
                    candidate_translations[index] = translation

        # If no candidates were found, return the original text.
        if not candidate_indices:
            return text

        # Calculate the number of words to translate based on error_rate.
        num_to_translate = int(len(candidate_indices) * error_rate)
        if num_to_translate == 0 and candidate_indices:
            num_to_translate = 1  # Ensure at least one translation if possible.

        indices_to_translate = random.sample(candidate_indices, min(num_to_translate, len(candidate_indices)))

        # Reconstruct the text with the selected translations.
        new_tokens = []
        for i, token in enumerate(tokens):
            if i in indices_to_translate:
                new_tokens.append(candidate_translations.get(i, token))
            else:
                new_tokens.append(token)

        # Reassemble tokens into the final text.
        new_text = " ".join(new_tokens)

        return new_text

