"""
NLP Preprocessing Pipeline for Traffic Incidents & Citizen Complaints.
Covers Syllabus: Tokenization, Stop Words, Stemming, Lemmatization, POS Tagging.
"""
import re
from typing import Dict, List, Any

# Common English and traffic-specific stopwords
DEFAULT_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't",
    "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't",
    "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm",
    "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more",
    "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
    "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's",
    "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they",
    "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under",
    "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't",
    "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom",
    "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
    "your", "yours", "yourself", "yourselves"
}

# Simple Porter-style suffix stripping for stemming baseline
def simple_stem(word: str) -> str:
    w = word.lower()
    for suffix in ("ing", "edly", "ingly", "ed", "es", "s", "ly", "tion", "ment", "ness"):
        if w.endswith(suffix) and len(w) - len(suffix) > 2:
            return w[:-len(suffix)]
    return w

class TrafficNLPPreprocessor:
    """Processes unstructured citizen complaints into structured linguistic tokens."""
    
    def __init__(self):
        self.spacy_nlp = None
        try:
            import spacy
            self.spacy_nlp = spacy.load("en_core_web_sm")
        except Exception:
            self.spacy_nlp = None

    def clean_text(self, text: str) -> str:
        """Removes URLs, non-alphanumeric junk, and normalizes whitespace."""
        if not text:
            return ""
        text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)
        text = re.sub(r"[@#][A-Za-z0-9_]+", "", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def tokenize(self, text: str) -> List[str]:
        """Regex-based tokenization preserving road numbers like NH-44 and KM-12."""
        text = self.clean_text(text)
        tokens = re.findall(r"\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?\b", text)
        return tokens

    def process(self, text: str) -> Dict[str, Any]:
        """
        Executes full preprocessing pipeline:
        Tokenization -> Stopwords Filtering -> POS Tagging -> Lemmatization -> Stemming
        """
        cleaned = self.clean_text(text)
        tokens = self.tokenize(cleaned)
        
        filtered_tokens = [t for t in tokens if t.lower() not in DEFAULT_STOPWORDS]
        stemmed_tokens = [simple_stem(t) for t in filtered_tokens]
        
        pos_tags = []
        lemmas = []
        
        if self.spacy_nlp:
            doc = self.spacy_nlp(cleaned)
            for token in doc:
                if not token.is_space and not token.is_punct:
                    pos_tags.append({
                        "text": token.text,
                        "pos": token.pos_,
                        "tag": token.tag_,
                        "dep": token.dep_
                    })
                    if token.text.lower() not in DEFAULT_STOPWORDS:
                        lemmas.append(token.lemma_.lower())
        else:
            # Fallback simple POS heuristic
            for token in tokens:
                pos = "NOUN"
                if token.lower() in {"huge", "heavy", "broken", "fatal", "severe", "open", "dense"}:
                    pos = "ADJ"
                elif token.lower() in {"causing", "blocked", "skidding", "flooded", "broken", "delayed"}:
                    pos = "VERB"
                pos_tags.append({"text": token, "pos": pos, "tag": pos, "dep": "dep"})
                lemmas = [simple_stem(t) for t in filtered_tokens]

        return {
            "original_text": text,
            "cleaned_text": cleaned,
            "token_count": len(tokens),
            "tokens": tokens,
            "filtered_tokens": filtered_tokens,
            "stemmed_tokens": stemmed_tokens,
            "lemmas": lemmas,
            "pos_tags": pos_tags
        }

    process_text = process

    def generate_bag_of_words(self, texts: List[str], max_features: int = 15) -> Dict[str, Any]:
        """
        Computes Bag of Words (BoW) frequency matrix using CountVectorizer.
        Syllabus Concept: Document-term occurrence representation disregarding grammar and order.
        """
        from sklearn.feature_extraction.text import CountVectorizer
        cv = CountVectorizer(stop_words="english", max_features=max_features)
        X = cv.fit_transform(texts)
        vocab = cv.get_feature_names_out().tolist()
        matrix = X.toarray().tolist()
        return {
            "method": "Bag of Words (CountVectorizer)",
            "vocabulary": vocab,
            "vocabulary_size": len(vocab),
            "document_vectors": matrix,
            "syllabus_note": "Bag of Words maps text into a vector of word counts; limitation: high dimensionality, sparsity, and ignores word order."
        }

    def generate_tfidf(self, texts: List[str], max_features: int = 15) -> Dict[str, Any]:
        """
        Computes Term Frequency - Inverse Document Frequency (TF-IDF) matrix.
        Syllabus Concept: Weighs terms high if frequent in a specific document but rare across the corpus.
        """
        from sklearn.feature_extraction.text import TfidfVectorizer
        tfidf = TfidfVectorizer(stop_words="english", max_features=max_features)
        X = tfidf.fit_transform(texts)
        feature_names = tfidf.get_feature_names_out().tolist()
        scores = X.toarray()
        
        # Mean TF-IDF score across corpus for top terms
        mean_scores = scores.mean(axis=0)
        ranked_terms = sorted(
            [{"term": term, "tfidf_score": round(float(score), 4)} for term, score in zip(feature_names, mean_scores)],
            key=lambda x: x["tfidf_score"],
            reverse=True
        )
        
        return {
            "method": "TF-IDF (Term Frequency - Inverse Document Frequency)",
            "top_terms": ranked_terms,
            "vocabulary_size": len(feature_names),
            "formula": "TF-IDF(t, d) = TF(t, d) * log(|D| / (1 + |{d in D : t in d}|))",
            "syllabus_note": "TF-IDF penalizes ubiquitous terms (e.g. 'road', 'the') and magnifies discriminative incident terms like 'pothole' and 'ambulance'."
        }

    def demonstrate_nlp_basics(self, text: str) -> Dict[str, Any]:
        """
        Executes complete demonstration of NLP Fundamentals from the syllabus on sample text.
        """
        prep = self.process(text)
        sample_corpus = [
            text,
            "Heavy commercial truck breakdown blocking entire flyover ramp causing gridlock.",
            "Deep crater and pothole near metro station injuring two-wheeler riders."
        ]
        bow = self.generate_bag_of_words(sample_corpus, max_features=10)
        tfidf = self.generate_tfidf(sample_corpus, max_features=10)
        
        return {
            "text": text,
            "tokenization": {
                "total_tokens": prep["token_count"],
                "tokens": prep["tokens"]
            },
            "stop_words_removal": {
                "filtered_tokens": prep["filtered_tokens"],
                "removed_count": prep["token_count"] - len(prep["filtered_tokens"])
            },
            "stemming_vs_lemmatization": {
                "stemmed": prep["stemmed_tokens"],
                "lemmas": prep["lemmas"],
                "explanation": "Stemming uses rule-based suffix truncation (skidding -> skid); Lemmatization uses dictionary morphological analysis."
            },
            "pos_tagging": prep["pos_tags"][:8],
            "bag_of_words": bow,
            "tfidf": tfidf
        }

if __name__ == "__main__":
    preprocessor = TrafficNLPPreprocessor()
    sample = "Huge pothole near NH-44 flyover causing bike skids since morning!"
    result = preprocessor.process(sample)
    print("Tokens:", result["tokens"])
    print("Filtered:", result["filtered_tokens"])
    print("Lemmas:", result["lemmas"][:5])
    print("POS Sample:", result["pos_tags"][:3])
