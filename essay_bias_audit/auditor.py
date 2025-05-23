import pandas as pd
from .variations import get_variation

class Auditor:
    """
    Auditor for text grading bias. Applies a user-provided text grading model,
    computes accuracy if true grades are provided, applies text variations,
    and audits how variations impact model grades.
    """
    def __init__(self, model, data: pd.DataFrame):
        """
        Initialize the Auditor.

        Args:
            model: Callable[[str, str], Any], a function that takes (text) and returns a grade.
            data: pd.DataFrame with column 'text', and optional 'true_grade'.
        """
        self.model = model
        self.data = data.copy()
        if 'text' not in self.data.columns:
            raise ValueError("DataFrame must contain 'text' columns.")
        self.results = None

    def grade(self, texts: pd.DataFrame = None) -> pd.DataFrame:
        """
        Grade texts using the model.

        Args:
            texts: Optional DataFrame to grade; if None, grades self.data.
        Returns:
            DataFrame with an added 'predicted_grade' column.
        """
        df = self.data if texts is None else texts.copy()
        preds = [self.model(row['text']) for _, row in df.iterrows()]
        df['predicted_grade'] = preds
        return df

    def accuracy(self) -> float:
        """
        Compute accuracy of predictions against true grades.

        Returns:
            Accuracy (fraction correct) if 'true_grade' is in data.
        """
        if 'true_grade' not in self.data.columns:
            raise ValueError("No 'true_grade' column in data.")
        scored = self.grade()
        correct = scored['predicted_grade'] == scored['true_grade']
        return float(correct.mean())

    def perturb(self, variation_name: str, magnitude: int) -> pd.DataFrame:
        """
        Apply a text variation to all texts.

        Args:
            variation_name: Name of the variation to apply.
            magnitude: Variation magnitude (0-100).
        Returns:
            DataFrame with perturbed 'text' column.
        """
        variation = get_variation(variation_name)
        df = self.data.copy()
        df['text'] = df['text'].apply(lambda text: variation.apply(text, magnitude))
        return df

    def audit(self, variations: list, magnitudes: list) -> pd.DataFrame:
        """
        Run the bias audit by applying each variation and recording grade changes.

        Args:
            variations: List of variation names.
            magnitudes: List of magnitudes corresponding to each variation.
        Returns:
            DataFrame summarizing original and perturbed grades.
        """
        if len(variations) != len(magnitudes):
            raise ValueError("Variations and magnitudes must have the same length.")

        # Grade original texts 
        original = self.grade()
        original = original[['predicted_grade']].rename(columns={'predicted_grade': 'original_grade'})

        results = []
        for variation_name, mag in zip(variations, magnitudes):
            perturbed_df = self.perturb(variation_name, mag)
            scored = self.grade(texts=perturbed_df)
            for idx, orig_row in original.iterrows():
                pert_grade = scored.loc[idx, 'predicted_grade']
                orig_grade = orig_row['original_grade']
                results.append({
                    'index': idx,
                    'variation': variation_name,
                    'magnitude': mag,
                    'original_grade': orig_grade,
                    'perturbed_grade': pert_grade,
                    'difference': pert_grade - orig_grade,
                })
        self.results = pd.DataFrame(results)
        return self.results
    
    def preview_variation(
        self,
        variation_name: str,
        magnitude: int,
        n_samples: int = 5,
        random_state: int = None,
    ) -> pd.DataFrame:
        """
        Preview a few examples of original vs. perturbed texts for a given variation.

        Args:
            variation_name: Name of the variation to apply.
            magnitude: Variation magnitude (0-100).
            n_samples: Number of samples to return (defaults to 5).
            random_state: Optional random seed for reproducible sampling.
        Returns:
            DataFrame with columns ['index', 'prompt', 'original_text', 'perturbed_text'],
            containing a random sample of texts and their perturbed versions.
        """
        perturbed = self.perturb(variation_name, magnitude)
        df_orig = self.data.reset_index()
        df_preview = pd.DataFrame({
            'index': df_orig['index'],
            'prompt': df_orig['prompt'],
            'original_text': df_orig['text'],
            'perturbed_text': perturbed['text'].values,
        })
        n = min(n_samples, len(df_preview))
        if random_state is not None:
            sample_df = df_preview.sample(n=n, random_state=random_state)
        else:
            sample_df = df_preview.sample(n=n)
        return sample_df.reset_index(drop=True)
