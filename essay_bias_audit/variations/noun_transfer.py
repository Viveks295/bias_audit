import random
import nltk
from deep_translator import GoogleTranslator
from .base import Variation

# Translator instance (uses free Google Translate)
translator = GoogleTranslator(source='auto', target='es')

class NounTransferVariation(Variation):
    """
    Variation that performs noun transfer transformations.
    """
    def apply(self, text: str, magnitude: int) -> str:
        """
        Apply noun transfer transformation based on magnitude.

        Args:
            text: Original text.
            magnitude: Strength of transformation (0-100).
        Returns:
            Transformed text.
        """
        # TODO: implement noun transfer based on magnitude
        def translate_word(word):
            # Use deep-translator GoogleTranslate under the hood
            return translator.translate(word)

        def noun(word, tag):
            return tag.startswith('NN') 

        noun_cache = {}

        error_rate = magnitude / 100.0
        tokens = nltk.word_tokenize(text)
        tagged_tokens = nltk.pos_tag(tokens)
        nouns = [word for word, tag in tagged_tokens if noun(word, tag)]
        num_nouns_to_translate = int(len(nouns) * error_rate)

        if num_nouns_to_translate == 0 and len(nouns) > 0:
            num_nouns_to_translate = 1 # Translate at least one noun

        if len(nouns) > 0:
            indices_to_translate = random.sample(range(len(nouns)), min(num_nouns_to_translate, len(nouns)))

            new_text = ""
            noun_index = 0
            for word, tag in tagged_tokens:
                if noun(word, tag) and noun_index in indices_to_translate:
                    try:
                        if word in noun_cache:
                            translation = noun_cache[word]
                        else:
                            translation = translate_word(word)
                            noun_cache[word] = translation
                        new_text += translation + " "
                    except Exception as e:
                        print(f"Error translating '{word}': {e}")
                        new_text += word + " "
                else:
                    new_text += word + " "
                if noun(word, tag):
                    noun_index += 1
            return new_text.strip()
        else:
            return text
