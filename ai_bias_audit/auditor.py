import pandas as pd
from .variations import get_variation
from .features import count_words, count_nouns, count_cognates
from scipy.stats import skew

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
            model: Callable[[str], Any], a function that takes (text) and returns a grade.
            data: pd.DataFrame with column 'text', and optional 'true_grade'.
        """
        self.model = model
        self.data = data.copy()
        if 'text' not in self.data.columns:
            raise ValueError("DataFrame must contain 'text' columns.")
        self.results = None
        # Add feature columns if not present
        if 'num_words' not in self.data.columns:
            self.data['num_words'] = self.data['text'].apply(count_words)

    def grade(self, texts: pd.DataFrame = None) -> pd.DataFrame:
        """
        Grade texts using the model.

        Args:
            texts: Optional DataFrame to grade; if None, grades self.data.
        Returns:
            DataFrame with an added 'predicted_grade' column.
        """
        df = self.data if texts is None else texts.copy()
        preds = []
        for _, row in df.iterrows():
            try:
                pred = self.model(row['text'])
                # Ensure the prediction is numeric
                if isinstance(pred, (int, float)):
                    preds.append(float(pred))
                else:
                    # Try to convert to float, if it fails, use NaN
                    try:
                        preds.append(float(pred))
                    except (ValueError, TypeError):
                        print(f"Warning: Model returned non-numeric value '{pred}' for text. Using NaN.")
                        preds.append(float('nan'))
            except Exception as e:
                print(f"Warning: Model failed to grade text: {str(e)}. Using NaN.")
                preds.append(float('nan'))
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

    def audit(self, variations: list, magnitudes: list, score_cutoff: float = None, group_col: str = None) -> pd.DataFrame:
        """
        Run the bias audit by applying each variation and recording grade changes.

        Args:
            variations: List of variation names.
            magnitudes: List of magnitudes corresponding to each variation.
            score_cutoff: Optional float. If provided, only texts with original grades >= this value are audited.
            group_col: Optional str. Name of the column to use for group/demographic analysis.
        Returns:
            DataFrame summarizing original and perturbed grades, including additional bias measures and group info if provided.
        """
        if len(variations) != len(magnitudes):
            raise ValueError("Variations and magnitudes must have the same length.")

        # Conditionally compute num_nouns and num_cognates if needed
        if ('noun_transfer' in variations) and ('num_nouns' not in self.data.columns):
            self.data['num_nouns'] = self.data['text'].apply(count_nouns)
        if ('cognates' in variations) and ('num_cognates' not in self.data.columns):
            self.data['num_cognates'] = self.data['text'].apply(count_cognates)

        # Grade original texts 
        original = self.grade()
        original = original[['predicted_grade']].rename(columns={'predicted_grade': 'original_grade'})

        # Apply score cutoff filter if specified
        if score_cutoff is not None:
            keep_idx = original[original['original_grade'] >= score_cutoff].index
            original = original.loc[keep_idx].reset_index(drop=True)
            filtered_data = self.data.loc[keep_idx].reset_index(drop=True)
        else:
            filtered_data = self.data.copy().reset_index(drop=True)
            original = original.reset_index(drop=True)

        # Prepare group values if needed
        group_vals = None
        if group_col is not None and group_col in filtered_data.columns:
            # Normalize group values: strip whitespace and convert to string
            group_vals = filtered_data[group_col].fillna('unknown').apply(lambda x: str(x).strip()).tolist()
        elif group_col is not None:
            group_vals = ['unknown'] * len(filtered_data)

        results = []
        for variation_name, mag in zip(variations, magnitudes):
            # Use filtered data for perturbation
            df_to_perturb = filtered_data.copy()
            variation = get_variation(variation_name)
            df_to_perturb['text'] = df_to_perturb['text'].apply(lambda text: variation.apply(text, mag))
            scored = self.grade(texts=df_to_perturb)
            for idx, orig_row in original.iterrows():
                pert_grade = scored.loc[idx, 'predicted_grade']
                orig_grade = orig_row['original_grade']
                row = {
                    'index': idx,
                    'variation': variation_name,
                    'magnitude': mag,
                    'original_grade': orig_grade,
                    'perturbed_grade': pert_grade,
                }
                if group_vals is not None:
                    row['group'] = group_vals[idx] if idx < len(group_vals) else 'unknown'
                results.append(row)
        self.results = pd.DataFrame(results)

        # --- Additional bias measures ---
        if not self.results.empty:
            m = self.results['magnitude'] / 100
            err = self.results['original_grade'] - self.results['perturbed_grade']
            orig = self.results['original_grade']
            # Map variation to feature column
            var_to_col = {
                'spelling': 'num_words',
                'spanglish': 'num_words',
                'noun_transfer': 'num_nouns',
                'cognates': 'num_cognates'
            }
            # Get the relevant feature for each row
            self.results['feature_col'] = self.results['variation'].map(var_to_col)
            # Use filtered_data for feature values
            self.results['feature_val'] = [
                filtered_data.loc[idx, col] if col in filtered_data.columns else 1
                for idx, col in zip(self.results['index'], self.results['feature_col'])
            ]
            self.results['num_words_val'] = [
                filtered_data.loc[idx, 'num_words'] if 'num_words' in filtered_data.columns else 1
                for idx in self.results['index']
            ]
            self.results['pert'] = self.results['feature_val'] / self.results['num_words_val']
            # Compute bias measures
            self.results['bias_0'] = err
            self.results['bias_1'] = err / m.replace(0, 1e-8)
            self.results['bias_2'] = err / ((m * self.results['pert']).replace(0, 1e-8))
            self.results['bias_3'] = err / (1 - orig.replace(1, 1-1e-8))
            # Drop helper columns
            self.results.drop(columns=['feature_col', 'feature_val', 'num_words_val', 'pert'], inplace=True)
            
            # Round numeric columns to 3 decimal places
            numeric_columns = ['original_grade', 'perturbed_grade', 'bias_0', 'bias_1', 'bias_2', 'bias_3']
            for col in numeric_columns:
                if col in self.results.columns:
                    self.results[col] = self.results[col].round(3)
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

    def audit_moments(self, group_col: str = None) -> pd.DataFrame:
        """
        Return a DataFrame with mean, variance, and skewness for each bias measure, grouped by variation, magnitude, and group (if provided).
        Ensures that the output always includes rows for 'all' (aggregate), as well as for each unique group value present in the data.
        Args:
            group_col: Optional str. Name of the column to use for group/demographic analysis.
        Returns:
            DataFrame with columns: variation, magnitude, [group], bias_X_mean, bias_X_var, bias_X_skew for X in 0,1,2,3
        """
        if self.results is None or self.results.empty:
            raise ValueError("No audit results available. Run audit() first.")
        
        # Check if required bias columns exist
        bias_cols = ['bias_0', 'bias_1', 'bias_2', 'bias_3']
        missing_cols = [col for col in bias_cols if col not in self.results.columns]
        if missing_cols:
            raise ValueError(f"Missing required bias columns: {missing_cols}. Run audit() first.")
        
        moments = []
        group_cols = ['variation', 'magnitude']
        if group_col is not None and 'group' in self.results.columns:
            group_cols.append('group')
            # Get all unique group values from the results
            unique_groups = sorted(self.results['group'].dropna().unique().tolist())
        else:
            unique_groups = []
        
        # Always aggregate for each (variation, magnitude) pair, regardless of group_col
        unique_variations = sorted(self.results['variation'].unique().tolist())
        unique_magnitudes = sorted(self.results['magnitude'].unique().tolist())
        
        for variation in unique_variations:
            for magnitude in unique_magnitudes:
                # Aggregate over all data for this variation/magnitude
                df_all = self.results[(self.results['variation'] == variation) & (self.results['magnitude'] == magnitude)]
                row = {'variation': variation, 'magnitude': magnitude}
                if group_col is not None:
                    row['group'] = 'all'
                for col in bias_cols:
                    vals = df_all[col].dropna()
                    if len(vals) == 0:
                        row[f'{col}_mean'] = float('nan')
                        row[f'{col}_var'] = float('nan')
                        row[f'{col}_skew'] = float('nan')
                    else:
                        row[f'{col}_mean'] = vals.mean()
                        row[f'{col}_var'] = vals.var(ddof=1) if len(vals) > 1 else 0.0
                        try:
                            row[f'{col}_skew'] = skew(vals, bias=False) if len(vals) > 2 else 0.0
                        except Exception as e:
                            print(f"Warning: Could not calculate skewness for {col}: {str(e)}. Using 0.0.")
                            row[f'{col}_skew'] = 0.0
                moments.append(row)
                # Per-group (if group_col is set)
                for group in unique_groups:
                    df_group = self.results[(self.results['variation'] == variation) & (self.results['magnitude'] == magnitude) & (self.results['group'] == group)]
                    row = {'variation': variation, 'magnitude': magnitude, 'group': group}
                    for col in bias_cols:
                        vals = df_group[col].dropna()
                        if len(vals) == 0:
                            row[f'{col}_mean'] = float('nan')
                            row[f'{col}_var'] = float('nan')
                            row[f'{col}_skew'] = float('nan')
                        else:
                            row[f'{col}_mean'] = vals.mean()
                            row[f'{col}_var'] = vals.var(ddof=1) if len(vals) > 1 else 0.0
                            try:
                                row[f'{col}_skew'] = skew(vals, bias=False) if len(vals) > 2 else 0.0
                            except Exception as e:
                                print(f"Warning: Could not calculate skewness for {col}: {str(e)}. Using 0.0.")
                                row[f'{col}_skew'] = 0.0
                    moments.append(row)
        
        moments_df = pd.DataFrame(moments)
        
        # Round numeric columns to 3 decimal places
        numeric_columns = [col for col in moments_df.columns if any(bias_measure in col for bias_measure in ['bias_0', 'bias_1', 'bias_2', 'bias_3'])]
        for col in numeric_columns:
            moments_df[col] = moments_df[col].round(3)
        
        return moments_df
