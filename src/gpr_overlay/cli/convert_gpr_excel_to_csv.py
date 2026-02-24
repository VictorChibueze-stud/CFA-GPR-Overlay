from pathlib import Path
from typing import Optional, Sequence

import pandas as pd


def _get_column(
    df: pd.DataFrame,
    candidates: Sequence[str],
    required: bool = False,
    name_for_error: str | None = None,
) -> Optional[pd.Series]:
    """
    Try a list of candidate column names (already uppercased).
    Return the first found; if none found and required=True -> raise.
    """
    for cand in candidates:
        if cand in df.columns:
            return df[cand]

    if required:
        label = name_for_error or "/".join(candidates)
        raise ValueError(f"Required column(s) not found in Excel file: {label}")

    return None


def convert_gpr_excel_to_csv(
    input_path: Path,
    output_path: Path,
    sheet_name: Optional[str | int] = None,
) -> None:
    """
    Convert a GPR Excel file (e.g. data_gpr_daily_recent.xls) into a cleaned CSV
    with the following columns:

        N10D
        GPRD
        GPRD_ACT
        GPRD_THREAT
        date
        GPRD_MA30
        GPRD_MA7
        event

    Assumptions / behaviour
    -----------------------
    - Input is a .xls or .xlsx file from Caldara & Iacoviello.
    - Typical original columns include:
        DAY, GPRD, GPRD_ACT or GPRD_AC, GPRD_THREAT or GPRD_TH, N10D,
        and potentially moving averages and event labels.
    - If GPRD_MA30 / GPRD_MA7 do not exist, they are computed as rolling
      30-day and 7-day means of GPRD.
    - If an 'event' column is not present, it is filled with empty values.

    Notes
    -----
    - This function only handles file-level cleaning. Ingestion into Mongo
      and further validation happen in higher-level services.
    """
    input_path = Path(input_path)
    output_path = Path(output_path)

    if not input_path.exists():
        raise FileNotFoundError(f"Input Excel file not found: {input_path}")

    # If sheet_name is None, explicitly pick the first sheet (0) to avoid
    # getting a dict of DataFrames from pandas.
    effective_sheet = 0 if sheet_name is None else sheet_name

    df = pd.read_excel(input_path, sheet_name=effective_sheet)

    # Normalise column names to UPPERCASE and strip whitespace
    df.columns = [str(c).strip().upper() for c in df.columns]

    # --- Core required series ---

    # DATE / DAY column: often called DAY with format YYYYMMDD
    day_series = _get_column(
        df, ["DATE", "DAY"], required=True, name_for_error="DATE/DAY"
    )

    # Try to parse DAY as YYYYMMDD; if that fails, let pandas guess
    # (this covers both integer and string encodings).
    day_as_str = day_series.astype(str)
    # Heuristic: if most entries have length 8, assume YYYYMMDD
    if (day_as_str.str.len() == 8).mean() > 0.8:
        date_parsed = pd.to_datetime(day_as_str, format="%Y%m%d", errors="coerce")
    else:
        date_parsed = pd.to_datetime(day_series, errors="coerce")

    if date_parsed.isna().all():
        raise ValueError("Could not parse dates from DATE/DAY column.")

    # Normalise to date (no time)
    date_col = date_parsed.dt.date

    # GPRD: required
    gprd = _get_column(df, ["GPRD"], required=True, name_for_error="GPRD")

    # N10D: optional but recommended
    n10d = _get_column(df, ["N10D"], required=False)

    # GPRD_ACT: could be called GPRD_ACT or GPRD_AC in the source
    gprd_act = _get_column(
        df,
        ["GPRD_ACT", "GPRD_AC"],
        required=False,
    )

    # GPRD_THREAT: could be called GPRD_THREAT or GPRD_TH
    gprd_threat = _get_column(
        df,
        ["GPRD_THREAT", "GPRD_TH"],
        required=False,
    )

    # Moving averages: use existing if present, otherwise compute from GPRD
    gprd_ma30 = _get_column(df, ["GPRD_MA30"], required=False)
    if gprd_ma30 is None:
        gprd_ma30 = gprd.rolling(window=30, min_periods=1).mean()

    gprd_ma7 = _get_column(df, ["GPRD_MA7"], required=False)
    if gprd_ma7 is None:
        gprd_ma7 = gprd.rolling(window=7, min_periods=1).mean()

    # Event labels: optional
    event = _get_column(df, ["EVENT"], required=False)
    if event is None:
        # Fill with empty strings if no event column exists
        event = pd.Series([""] * len(df), index=df.index)

    # --- Build cleaned DataFrame in the exact desired order ---

    cleaned = pd.DataFrame(
        {
            "N10D": n10d if n10d is not None else pd.Series([pd.NA] * len(df)),
            "GPRD": gprd,
            "GPRD_ACT": gprd_act if gprd_act is not None else pd.Series([pd.NA] * len(df)),
            "GPRD_THREAT": gprd_threat
            if gprd_threat is not None
            else pd.Series([pd.NA] * len(df)),
            "date": date_col,
            "GPRD_MA30": gprd_ma30,
            "GPRD_MA7": gprd_ma7,
            "event": event,
        }
    )

    # Save to CSV (no index)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cleaned.to_csv(output_path, index=False)


if __name__ == "__main__":
    # Example usage from project root:
    #
    #   python src/gpr_overlay/cli/convert_gpr_excel_to_csv.py \
    #       data/raw/gpr_daily_original/data_gpr_daily_recent.xls \
    #       data/raw/gpr_daily_original/gpr_daily_recent.csv
    #
    import argparse

    parser = argparse.ArgumentParser(
        description="Convert GPR Excel file to cleaned CSV format."
    )
    parser.add_argument("input", type=str, help="Path to the GPR Excel file (.xls/.xlsx)")
    parser.add_argument("output", type=str, help="Path to write the output CSV")
    parser.add_argument(
        "--sheet-name",
        type=str,
        default=None,
        help="Optional Excel sheet name or index (default: first sheet)",
    )

    args = parser.parse_args()

    # Allow numeric sheet index via sheet-name
    sheet_arg: str | int | None
    if args.sheet_name is None:
        sheet_arg = None
    else:
        try:
            sheet_arg = int(args.sheet_name)
        except ValueError:
            sheet_arg = args.sheet_name

    convert_gpr_excel_to_csv(
        input_path=Path(args.input),
        output_path=Path(args.output),
        sheet_name=sheet_arg,
    )
