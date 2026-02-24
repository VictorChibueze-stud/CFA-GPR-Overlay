"""
Diagnostic script to analyze ETF holdings structure and map to existing taxonomy.

Tasks:
1. Read LCTD_holdings.csv with dynamic header detection
2. Extract and summarize Sector column
3. Compare with existing taxonomy in synthetic_portfolio.csv
"""

import pandas as pd
import os
from pathlib import Path
from collections import Counter


def find_header_row(file_path, header_marker="Ticker"):
    """
    Find the row containing the actual header by looking for header_marker.
    
    Args:
        file_path: Path to the CSV file
        header_marker: String to identify the header row
        
    Returns:
        Row number (0-indexed) where header starts
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if header_marker in line:
                return i
    return None


def analyze_lctd_holdings():
    """Analyze the LCTD holdings file."""
    print("=" * 80)
    print("ANALYZING: data/LCTD_holdings.csv")
    print("=" * 80)
    
    file_path = Path("data/LCTD_holdings.csv")
    
    if not file_path.exists():
        print(f"ERROR: File not found at {file_path}")
        return
    
    # Find the header row dynamically
    header_row = find_header_row(file_path)
    
    if header_row is None:
        print("ERROR: Could not find header row containing 'Ticker'")
        return
    
    print(f"INFO: Header row found at line {header_row + 1}")
    
    # Read the CSV with correct header row
    try:
        df = pd.read_csv(file_path, skiprows=header_row)
        print(f"INFO: Successfully read CSV with {len(df)} rows")
    except Exception as e:
        print(f"ERROR: Failed to read CSV: {e}")
        return
    
    # Extract Sector column
    if 'Sector' not in df.columns:
        print("ERROR: 'Sector' column not found")
        print(f"Available columns: {list(df.columns)}")
        return
    
    sectors = df['Sector'].dropna()
    
    print(f"\n{'SUMMARY':^80}")
    print("-" * 80)
    print(f"Total rows with Sector data: {len(sectors)}")
    print(f"Total rows in file: {len(df)}")
    
    # Unique sectors
    unique_sectors = sectors.unique()
    print(f"\nUnique sectors found: {len(unique_sectors)}")
    print(f"Sectors: {sorted(unique_sectors)}")
    
    # Value counts
    sector_counts = Counter(sectors)
    print(f"\nSector distribution (value counts):")
    for sector, count in sorted(sector_counts.items(), key=lambda x: x[1], reverse=True):
        pct = (count / len(sectors)) * 100
        print(f"  {sector:30s}: {count:3d} rows ({pct:5.2f}%)")


def analyze_synthetic_portfolio():
    """Analyze the synthetic portfolio file to show existing taxonomy."""
    print(f"\n{'=' * 80}")
    print("ANALYZING: data/synthetic_portfolio.csv (Existing Taxonomy)")
    print("=" * 80)
    
    file_path = Path("data/synthetic_portfolio.csv")
    
    if not file_path.exists():
        print(f"INFO: File not found at {file_path} - skipping")
        return
    
    try:
        df = pd.read_csv(file_path)
        print(f"INFO: Successfully read CSV with {len(df)} rows")
    except Exception as e:
        print(f"ERROR: Failed to read CSV: {e}")
        return
    
    # Analyze fed_industry_name
    if 'fed_industry_name' in df.columns:
        print(f"\n{'FED_INDUSTRY_NAME (Existing Taxonomy)':^80}")
        print("-" * 80)
        industry_names = df['fed_industry_name'].dropna().unique()
        print(f"Unique fed_industry_name values: {len(industry_names)}")
        for name in sorted(industry_names):
            count = (df['fed_industry_name'] == name).sum()
            pct = (count / len(df)) * 100
            print(f"  {name:40s}: {count:3d} rows ({pct:5.2f}%)")
    else:
        print("WARNING: 'fed_industry_name' column not found")
    
    # Analyze gpr_beta
    if 'gpr_beta' in df.columns:
        print(f"\n{'GPR_BETA (Current Values)':^80}")
        print("-" * 80)
        gpr_beta = df['gpr_beta'].dropna()
        print(f"Total gpr_beta values: {len(gpr_beta)}")
        print(f"Min: {gpr_beta.min():.6f}")
        print(f"Max: {gpr_beta.max():.6f}")
        print(f"Mean: {gpr_beta.mean():.6f}")
        print(f"Median: {gpr_beta.median():.6f}")
        print(f"Std Dev: {gpr_beta.std():.6f}")
    else:
        print("WARNING: 'gpr_beta' column not found")


if __name__ == "__main__":
    analyze_lctd_holdings()
    analyze_synthetic_portfolio()
    print(f"\n{'=' * 80}")
    print("Analysis complete.")
    print("=" * 80)
