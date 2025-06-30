import importlib.util
import sys

import click
import pandas as pd

from .auditor import Auditor

@click.command()
@click.option('--data', required=True, type=click.Path(exists=True), help='Path to CSV file with text column')
@click.option('--model-script', required=True, type=click.Path(exists=True), help='Path to Python script defining the grading function')
@click.option('--model-func', default='grade', help='Name of the grading function in the script')
@click.option('--variations', multiple=True, required=True, help='Variations to apply (e.g., spelling, spanglish)')
@click.option('--magnitudes', multiple=True, type=int, required=True, help='Magnitudes for each variation (0-100)')
@click.option('--output', default='audit_results.csv', help='Output CSV file for audit results')
def main(data, model_script, model_func, variations, magnitudes, output):
    """
    CLI for running an text bias audit.
    """
    if len(variations) != len(magnitudes):
        click.echo('Error: The number of variations must match the number of magnitudes.', err=True)
        sys.exit(1)

    df = pd.read_csv(data)

    spec = importlib.util.spec_from_file_location('model_module', model_script)
    model_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(model_module)
    if not hasattr(model_module, model_func):
        click.echo(f"Error: Function '{model_func}' not found in {model_script}.", err=True)
        sys.exit(1)
    model = getattr(model_module, model_func)

    auditor = Auditor(model=model, data=df)
    report = auditor.audit(list(variations), list(magnitudes))
    report.to_csv(output, index=False)
    click.echo(f'Audit results saved to {output}')

if __name__ == '__main__':  
    main()
