"""
Test for CFA publication spike-only event detection.

Verifies that:
1. Spike-only detection (include_regimes=False) returns ONLY spikes.
2. Event around 2025-06-23 is correctly detected.
3. NO regime events are returned in default mode.
"""

import sys
import os
from pathlib import Path
from datetime import date

# Add src to path
project_root = Path(__file__).parent.parent
src_path = project_root / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

import pytest
from gpr_overlay.services.gpr_ingestion_service import load_gpr_daily_from_csv
from gpr_overlay.services.gpr_event_detection_service import (
    detect_gpr_events,
    select_event_for_target_date,
    GprEventType,
)


@pytest.fixture
def gpr_points():
    """Load GPR sample data."""
    data_path = project_root / "data" / "gpr_daily_sample.csv"
    if not data_path.exists():
        pytest.skip(f"GPR data not found at {data_path}")
    return load_gpr_daily_from_csv(data_path)


def test_spike_only_detection(gpr_points):
    """Test that spike-only mode (default) returns no regimes."""
    events = detect_gpr_events(gpr_points, include_regimes=False)
    
    # Verify no regime events
    regime_events = [e for e in events if e.event_type == GprEventType.REGIME]
    assert len(regime_events) == 0, f"Expected no REGIME events, but found {len(regime_events)}"
    
    # Verify at least some spikes exist
    spike_types = {GprEventType.EXTREME_SPIKE, GprEventType.ELEVATED_SPIKE, GprEventType.SHORT_TERM_SPIKE}
    spike_events = [e for e in events if e.event_type in spike_types]
    assert len(spike_events) > 0, "Expected at least one spike event"
    
    print(f"✓ Spike-only detection: {len(spike_events)} spikes, {len(regime_events)} regimes")


def test_regimes_included_when_requested(gpr_points):
    """Test that regimes ARE returned when include_regimes=True."""
    events_spikes_only = detect_gpr_events(gpr_points, include_regimes=False)
    events_with_regimes = detect_gpr_events(gpr_points, include_regimes=True)
    
    # Should have more events when regimes are included
    assert len(events_with_regimes) >= len(events_spikes_only), \
        "Events with regimes should be >= spikes-only"
    
    # Verify regimes exist in the full list
    regime_events = [e for e in events_with_regimes if e.event_type == GprEventType.REGIME]
    assert len(regime_events) > 0, "Expected REGIME events when include_regimes=True"
    
    print(f"✓ Regimes conditional: spikes_only={len(events_spikes_only)}, with_regimes={len(events_with_regimes)}")


def test_event_near_target_date(gpr_points):
    """Test that an event exists near 2025-06-23."""
    target_date = date(2025, 6, 23)
    events = detect_gpr_events(gpr_points, include_regimes=False)
    
    # Find event closest to target date
    selected = select_event_for_target_date(events, target_date)
    
    assert selected is not None, "Expected an event near 2025-06-23"
    
    # Verify it's a spike type
    spike_types = {GprEventType.EXTREME_SPIKE, GprEventType.ELEVATED_SPIKE, GprEventType.SHORT_TERM_SPIKE}
    assert selected.event_type in spike_types, \
        f"Expected spike type, got {selected.event_type}"
    
    # Verify peak date is close (within 10 days for margin)
    days_diff = abs((selected.peak_date - target_date).days)
    assert days_diff <= 10, \
        f"Expected peak near {target_date}, got {selected.peak_date} ({days_diff} days diff)"
    
    print(f"✓ Target date {target_date}: Selected {selected.event_type.value} on {selected.peak_date}")
    print(f"  Severity: {selected.severity_score:.4f}, Window: {selected.start_date} to {selected.end_date}")


def test_no_regimes_in_default_detection(gpr_points):
    """Verify that default detect_gpr_events call returns NO regimes."""
    # Call without the include_regimes argument (should use default False)
    events = detect_gpr_events(gpr_points)
    
    regime_events = [e for e in events if e.event_type == GprEventType.REGIME]
    assert len(regime_events) == 0, \
        f"Default detection should have no REGIME events, but found {len(regime_events)}"
    
    print(f"✓ Default detection returns 0 regimes")


def test_spike_event_window(gpr_points):
    """Verify that spike events have the standard window (peak-7, peak+2)."""
    target_date = date(2025, 6, 23)
    events = detect_gpr_events(gpr_points, include_regimes=False)
    selected = select_event_for_target_date(events, target_date)
    
    # Check window sizes
    window_days = (selected.end_date - selected.start_date).days
    expected_window = 7 + 2  # 7 pre + 2 post
    
    # Allow some flexibility (±1 day) for edge cases
    assert abs(window_days - expected_window) <= 1, \
        f"Expected ~{expected_window} day window, got {window_days} days"
    
    # Verify start is ~7 days before peak
    pre_days = (selected.peak_date - selected.start_date).days
    assert 6 <= pre_days <= 8, f"Expected 7 pre-days, got {pre_days}"
    
    # Verify end is ~2 days after peak
    post_days = (selected.end_date - selected.peak_date).days
    assert 1 <= post_days <= 3, f"Expected 2 post-days, got {post_days}"
    
    print(f"✓ Spike window verified: {pre_days} pre-days + {post_days} post-days")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
