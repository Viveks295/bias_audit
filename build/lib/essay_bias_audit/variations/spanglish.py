import random
import re
import nltk
from deep_translator import GoogleTranslator
from .base import Variation

# Translator instance 
translator = GoogleTranslator(source='auto', target='es')
phrase_cache = {}

class SpanglishVariation(Variation):
    """
    Variation that mixes Spanish and English (Spanglish).
    """
    def apply(self, text: str, magnitude: int) -> str:
        """
        Introduce Spanglish code-switching based on magnitude.

        Args:
            text: Original English text.
            magnitude: % of words to translate or mix (0-100).
        Returns:
            Text with Spanglish modifications.
        """
        CONJUNCTIONS = r'\b(?:and|or|but|because|so|yet|although|though|since|unless|whereas|while)\b'

        def translate_phrase(phrase):
            return translator.translate(phrase)

        error_rate = magnitude / 100.0 
        sentences = nltk.sent_tokenize(text) 
        all_phrases = []
        phrase_indices = []

        # Collect all phrases from the text
        for sentence in sentences:
            phrases = re.split(rf'([,;:—]|(?:\s+{CONJUNCTIONS}\s+))', sentence)
            phrases = [phrase.strip() for phrase in phrases if phrase.strip()]  
            phrase_indices.append(len(all_phrases))  
            all_phrases.extend(phrases) 

        # Select global phrases for translation (only those with letters)
        letter_phrases = [i for i, phrase in enumerate(all_phrases) if any(c.isalpha() for c in phrase)]
        num_to_translate = max(1, int(len(letter_phrases) * error_rate))  
        selected_indices = set(random.sample(letter_phrases, min(num_to_translate, len(letter_phrases)))) 

        # Translate selected phrases
        translated_phrases = []
        for i, phrase in enumerate(all_phrases):
            if i in selected_indices:
                if phrase in phrase_cache:
                    translated_phrase = phrase_cache[phrase]
                else:
                    translated_phrase = translate_phrase(phrase)
                    phrase_cache[phrase] = translated_phrase
                translated_phrases.append(translated_phrase)
            else:
                translated_phrases.append(phrase)

        # Reconstruct the sentences correctly (with proper punctuation spacing)
        translated_sentences = []
        for idx, sentence in enumerate(sentences):
            start_idx = phrase_indices[idx] 
            end_idx = phrase_indices[idx + 1] if idx + 1 < len(phrase_indices) else len(translated_phrases)
            sentence_phrases = translated_phrases[start_idx:end_idx]

            # Fix punctuation spacing
            final_sentence = ""
            for i, phrase in enumerate(sentence_phrases):
                if i > 0 and re.match(r'^[,;:—]$', phrase):  
                    final_sentence = final_sentence.rstrip() + phrase 
                else:
                    final_sentence += " " + phrase  

            translated_sentences.append(final_sentence.strip())  

        return " ".join(translated_sentences).strip()

