"""Minimal setup.py for editable install with older pip."""
from setuptools import setup, find_packages

setup(
    name="affe",
    version="0.1.0",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=[
        "msal>=1.24.0",
        "requests>=2.28.0",
        "python-dotenv>=1.0.0",
        "flask>=2.0.0",
    ],
    entry_points={
        "console_scripts": [
            "affe=affe.main:main",
            "affe-ui=affe.ui:main",
        ],
    },
)
