from setuptools import setup, find_packages

setup(
    name='ai_bias_audit',
    version='0.1.0',
    packages=find_packages(),
    install_requires=[
        'pandas',
        'click',
        'nltk',
        'deep-translator'
    ],
    author='',
    author_email='',
    description='A package to audit bias in essay grading models',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    classifiers=[
        'Programming Language :: Python :: 3',
        'Operating System :: OS Independent',
    ],
    entry_points={
        'console_scripts': [
            'ai-bias-audit=ai_bias_audit.cli:main',
        ],
    },
    python_requires='>=3.6',
)