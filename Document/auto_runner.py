import os
import subprocess

print("Starting extraction for Table B.1 (Missing Pages)...")
subprocess.run(["python", "extract_perfect.py"], check=True)

print("Starting extraction for Table B.2 (Standard Scores)...")
subprocess.run(["python", "extract_domain_standard.py"], check=True)

print("Both extractions completed! Running merge_perfect.py...")
subprocess.run(["python", "merge_perfect.py"], check=True)

print("All done! Data is perfectly merged into norms.vineland2.local.json!")
