from .base import Variation

class SpanglishVariation(Variation):
    """
    Variation that mixes Spanish and English (Spanglish).
    """
    async def apply(self, text: str, magnitude: int) -> str:
        """
        Introduce Spanglish code-switching based on magnitude.

        Args:
            text: Original English text.
            magnitude: % of words to translate or mix (0-100).
        Returns:
            Text with Spanglish modifications.
        """
        # TODO: implement Spanglish mixing based on magnitude
        CONJUNCTIONS = r'\b(?:and|or|but|because|so|yet|although|though|since|unless|whereas|while)\b'

        async def translate_phrase(phrase):
            """Asynchronously translates a given phrase from English to Spanish."""
            try:
                result = await translator.translate(phrase, src='en', dest='es')
                return result.text  # Extract translated text
            except Exception as e:
                print(f"Error translating '{phrase}': {e}")
                return phrase  # Return original phrase if translation fails

        sentences = nltk.sent_tokenize(text)  # Tokenize text into sentences
        all_phrases = []  # Store all phrases globally
        phrase_indices = []  # Track where phrases belong for reconstruction

        # Step 1: Collect all phrases from the text
        for sentence in sentences:
            phrases = re.split(rf'([,;:—]|(?:\s+{CONJUNCTIONS}\s+))', sentence)
            phrases = [phrase.strip() for phrase in phrases if phrase.strip()]  # Remove empty items
            phrase_indices.append(len(all_phrases))  # Track index for later reconstruction
            all_phrases.extend(phrases)  # Store globally

        # Step 2: Select global phrases for translation (only those with letters)
        letter_phrases = [i for i, phrase in enumerate(all_phrases) if any(c.isalpha() for c in phrase)]
        num_to_translate = max(1, int(len(letter_phrases) * magnitude))  # Ensure at least one phrase is translated
        selected_indices = set(random.sample(letter_phrases, min(num_to_translate, len(letter_phrases))))  # Ensure valid selection

        # Step 3: Translate selected phrases asynchronously
        translated_phrases = []
        for i, phrase in enumerate(all_phrases):
            if i in selected_indices:
                if phrase in phrase_cache:
                    translated_phrase = phrase_cache[phrase]
                else:
                    translated_phrase = await translate_phrase(phrase)
                    phrase_cache[phrase] = translated_phrase
                translated_phrases.append(translated_phrase)
            else:
                translated_phrases.append(phrase)

        # Step 4: Reconstruct the sentences correctly (with proper punctuation spacing)
        translated_sentences = []
        for idx, sentence in enumerate(sentences):
            start_idx = phrase_indices[idx]  # Get phrase start index
            end_idx = phrase_indices[idx + 1] if idx + 1 < len(phrase_indices) else len(translated_phrases)
            sentence_phrases = translated_phrases[start_idx:end_idx]

            # Fix punctuation spacing
            final_sentence = ""
            for i, phrase in enumerate(sentence_phrases):
                if i > 0 and re.match(r'^[,;:—]$', phrase):  # If the phrase is just punctuation
                    final_sentence = final_sentence.rstrip() + phrase  # Attach punctuation directly
                else:
                    final_sentence += " " + phrase  # Normal spacing

            translated_sentences.append(final_sentence.strip())  # Remove extra spaces

        return " ".join(translated_sentences).strip()

