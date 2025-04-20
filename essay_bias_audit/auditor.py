import pandas as pd

from .variations import get_variation

class Auditor:
    """
    Auditor for essay grading bias. Applies a user-provided essay grading model,
    computes accuracy if true grades are provided, applies text variations,
    and audits how variations impact model grades.
    """
    def __init__(self, model, data: pd.DataFrame):
        """
        Initialize the Auditor.

        Args:
            model: Callable[[str, str], Any], a function that takes (prompt, essay) and returns a grade.
            data: pd.DataFrame with columns 'prompt' and 'essay', and optional 'true_grade'.
        """
        self.model = model
        self.data = data.copy()
        if 'prompt' not in self.data.columns or 'essay' not in self.data.columns:
            raise ValueError("DataFrame must contain 'prompt' and 'essay' columns.")
        self.results = None

    def grade(self, essays: pd.DataFrame = None) -> pd.DataFrame:
        """
        Grade essays using the model.

        Args:
            essays: Optional DataFrame to grade; if None, grades self.data.
        Returns:
            DataFrame with an added 'predicted_grade' column.
        """
        df = self.data if essays is None else essays.copy()
        preds = [self.model(row['prompt'], row['essay']) for _, row in df.iterrows()]
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
        Apply a text variation to all essays.

        Args:
            variation_name: Name of the variation to apply.
            magnitude: Variation magnitude (0-100).
        Returns:
            DataFrame with perturbed 'essay' column.
        """
        variation = get_variation(variation_name)
        df = self.data.copy()
        df['essay'] = df['essay'].apply(lambda text: variation.apply(text, magnitude))
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

        # Grade original essays
        original = self.grade()
        original = original[['predicted_grade']].rename(columns={'predicted_grade': 'original_grade'})

        results = []
        for variation_name, mag in zip(variations, magnitudes):
            perturbed_df = self.perturb(variation_name, mag)
            scored = self.grade(essays=perturbed_df)
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