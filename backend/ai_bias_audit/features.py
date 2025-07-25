import nltk
import difflib
from deep_translator import GoogleTranslator

# Translator instance for cognates
translator = GoogleTranslator(source='auto', target='es')


def count_words(text):
    return len(text.split())


def count_nouns(text):
    tokens = nltk.word_tokenize(text)
    tagged_tokens = nltk.pos_tag(tokens)
    return sum(1 for word, tag in tagged_tokens if tag.startswith('NN'))


def is_cognate(eng_word, esp_word, threshold=0.7):
    return difflib.SequenceMatcher(None, eng_word.lower(), esp_word.lower()).ratio() >= threshold


def count_cognates(text):
    tokens = nltk.word_tokenize(text)
    count = 0
    for token in tokens:
        if token.isalpha():
            try:
                translation = translator.translate(token)
                if is_cognate(token, translation):
                    count += 1
            except Exception:
                continue  # Skip if translation fails
    return count 