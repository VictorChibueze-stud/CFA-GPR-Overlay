"""
Convert raw ETF holdings (LCTD_holdings.csv) to standardized portfolio format.

Input: data/LCTD_holdings.csv
Output: data/LCTD_portfolio_2025-12-31.csv
"""

import pandas as pd
import re
from pathlib import Path
from typing import Optional, Tuple


# Sector to Industry Mapping with GPR Parameters
SECTOR_MAPPING = {
    "Financials": {
        "fed_industry_name": "Depository Institutions",
        "gpr_beta": 0.000594,
        "gpr_sentiment": 0.004827,
    },
    "Industrials": {
        "fed_industry_name": "Machinery",
        "gpr_beta": -0.00916,
        "gpr_sentiment": -0.00254,
    },
    "Consumer Discretionary": {
        "fed_industry_name": "Consumer Discretionary",
        "gpr_beta": -0.0113,
        "gpr_sentiment": 0.000276,
    },
    "Health Care": {
        "fed_industry_name": "Healthcare",
        "gpr_beta": 0.000818,
        "gpr_sentiment": 0.007934,
    },
    "Information Technology": {
        "fed_industry_name": "Computers",
        "gpr_beta": 0.007811,
        "gpr_sentiment": -0.00171,
    },
    "Materials": {
        "fed_industry_name": "Construction Materials",
        "gpr_beta": -0.00525,
        "gpr_sentiment": -0.01318,
    },
    "Consumer Staples": {
        "fed_industry_name": "Foodstuff",
        "gpr_beta": 0.00683,
        "gpr_sentiment": 0.001597,
    },
    "Communication": {
        "fed_industry_name": "Communication",
        "gpr_beta": 0.002999,
        "gpr_sentiment": -0.00474,
    },
    "Utilities": {
        "fed_industry_name": "Utilities",
        "gpr_beta": 0.000639,
        "gpr_sentiment": 0.00697,
    },
    "Energy": {
        "fed_industry_name": "Petroleum and Natural Gas",
        "gpr_beta": -0.00204,
        "gpr_sentiment": 0.002007,
    },
    "Real Estate": {
        "fed_industry_name": "Real Estate",
        "gpr_beta": -0.01994,
        "gpr_sentiment": -0.00039,
    },
}


def find_header_row(file_path: str, header_marker: str = "Ticker") -> Optional[int]:
    """
    Find the row containing the actual header by looking for header_marker.
    
    Args:
        file_path: Path to the CSV file
        header_marker: String to identify the header row
        
    Returns:
        Row number (0-indexed) where header starts, or None if not found
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if header_marker in line:
                return i
    return None


def clean_numeric(value: str) -> Optional[float]:
    """
    Clean and convert a numeric string to float.
    Handles commas and other formatting.
    
    Args:
        value: String value to convert
        
    Returns:
        Float value or None if conversion fails
    """
    if pd.isna(value) or value == '-' or value == '':
        return None
    
    try:
        # Remove commas and quotes
        cleaned = str(value).replace(',', '').replace('"', '')
        return float(cleaned)
    except (ValueError, AttributeError):
        return None


def map_sector(sector: str) -> Tuple[str, float, float, float]:
    """
    Map a sector to its fed_industry_name and GPR parameters.
    
    Args:
        sector: Raw sector name
        
    Returns:
        Tuple of (fed_industry_name, gpr_beta, gpr_sentiment, mapping_confidence)
    """
    if pd.isna(sector):
        return ("Unknown", 0.0, 0.0, 0.0)
    
    sector = str(sector).strip()
    
    # Check if it's Cash/Derivatives (skip or low confidence)
    if "Cash" in sector or "Derivatives" in sector:
        return ("Cash and/or Derivatives", 0.0, 0.0, 0.0)
    
    # Look up in mapping
    if sector in SECTOR_MAPPING:
        mapping = SECTOR_MAPPING[sector]
        return (
            mapping["fed_industry_name"],
            mapping["gpr_beta"],
            mapping["gpr_sentiment"],
            1.0,
        )
    
    # Unmapped sector
    print(f"WARNING: Unmapped sector: '{sector}'")
    return ("Unknown", 0.0, 0.0, 0.0)


def industry_name_to_id(industry_name: str) -> str:
    """
    Convert industry name to lowercase_underscore ID.
    
    Args:
        industry_name: Industry name (e.g., "Depository Institutions")
        
    Returns:
        Lowercase underscore version (e.g., "depository_institutions")
    """
    # Convert to lowercase and replace spaces with underscores
    return industry_name.lower().replace(" ", "_").replace("&", "and")


def build_publication_dataset():
    """Main function to build the publication dataset."""
    print("=" * 80)
    print("Building Publication Dataset from LCTD Holdings")
    print("=" * 80)
    
    input_file = Path("data/LCTD_holdings.csv")
    output_file = Path("data/LCTD_portfolio_2025-12-31.csv")
    
    # Check input file exists
    if not input_file.exists():
        print(f"ERROR: Input file not found: {input_file}")
        return
    
    # Find header row
    header_row = find_header_row(str(input_file))
    if header_row is None:
        print("ERROR: Could not find header row containing 'Ticker'")
        return
    
    print(f"INFO: Header row found at line {header_row + 1}")
    
    # Read CSV
    try:
        df = pd.read_csv(input_file, skiprows=header_row)
        print(f"INFO: Read {len(df)} rows from input file")
    except Exception as e:
        print(f"ERROR: Failed to read CSV: {e}")
        return
    
    # Verify required columns
    required_cols = ["Ticker", "Name", "Sector", "Weight (%)", "Market Value"]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"ERROR: Missing columns: {missing_cols}")
        print(f"Available columns: {list(df.columns)}")
        return
    
    # Build output dataframe
    output_rows = []
    mapped_count = 0
    unmapped_count = 0
    
    for idx, row in df.iterrows():
        sector = row["Sector"]
        
        # Skip cash/derivatives rows (they will have confidence 0.0)
        if pd.isna(sector):
            continue
        
        # Map sector
        fed_industry_name, gpr_beta, gpr_sentiment, confidence = map_sector(sector)
        
        # Clean numeric fields
        weight_pct = clean_numeric(row["Weight (%)"])
        market_value = clean_numeric(row["Market Value"])
        
        if weight_pct is None or market_value is None:
            # Skip rows with invalid data
            continue
        
        # Create output row
        output_row = {
            "fund_name": "iShares World ex U.S. Carbon Transition Readiness Aware Active ETF",
            "as_of_date": "2025-12-31",
            "security_name_report": row["Name"],
            "ticker_guess": row["Ticker"],
            "isin_guess": "",
            "sector_raw": sector,
            "weight_pct": weight_pct,
            "market_value_raw": market_value,
            "fed_industry_name": fed_industry_name,
            "fed_industry_id": industry_name_to_id(fed_industry_name),
            "gpr_beta": gpr_beta,
            "gpr_sentiment": gpr_sentiment,
            "mapping_confidence": confidence,
            "mapping_rationale_short": "Automated sector mapping.",
        }
        
        output_rows.append(output_row)
        
        if confidence > 0.0:
            mapped_count += 1
        else:
            unmapped_count += 1
    
    # Create output dataframe
    output_df = pd.DataFrame(output_rows)
    
    if len(output_df) == 0:
        print("ERROR: No valid rows to write")
        return
    
    # Write to CSV
    try:
        output_df.to_csv(output_file, index=False)
        print(f"\nINFO: Successfully wrote {len(output_df)} rows to {output_file}")
    except Exception as e:
        print(f"ERROR: Failed to write output CSV: {e}")
        return
    
    # Validation and reporting
    print(f"\n{'VALIDATION REPORT':^80}")
    print("-" * 80)
    print(f"Total rows processed: {len(output_df)}")
    print(f"Successfully mapped: {mapped_count}")
    print(f"Unmapped/Cash: {unmapped_count}")
    
    # Weight validation
    total_weight = output_df["weight_pct"].sum()
    print(f"\nTotal weight_pct: {total_weight:.4f}%")
    if abs(total_weight - 100.0) > 1.0:
        print(f"  WARNING: Weight does not sum to ~100% (difference: {100.0 - total_weight:.4f}%)")
    
    # Market value validation
    total_market_value = output_df["market_value_raw"].sum()
    print(f"Total market_value_raw: ${total_market_value:,.2f}")
    
    # Sector distribution
    print(f"\n{'Sector Distribution':^80}")
    sector_dist = output_df.groupby("sector_raw").size().sort_values(ascending=False)
    for sector, count in sector_dist.items():
        pct = (count / len(output_df)) * 100
        print(f"  {sector:30s}: {count:3d} rows ({pct:5.2f}%)")
    
    # Industry distribution
    print(f"\n{'Mapped Industry Distribution':^80}")
    industry_dist = output_df.groupby("fed_industry_name").size().sort_values(ascending=False)
    for industry, count in industry_dist.items():
        pct = (count / len(output_df)) * 100
        print(f"  {industry:40s}: {count:3d} rows ({pct:5.2f}%)")
    
    print(f"\n{'=' * 80}")
    print("Dataset build complete.")
    print("=" * 80)


if __name__ == "__main__":
    build_publication_dataset()
