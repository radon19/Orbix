import pandas as pd
from skyfield.api import load, EarthSatellite

import data.dataframe as db 

def get_satellite_states(target_norad_id: int):
    print("Initializing Time...")
    ts = load.timescale()
    current_time = ts.now()
    js_timestamp_ms = int(current_time.utc_datetime().timestamp() * 1000)

    if db.processed_df.empty or 'NORAD_CAT_ID' not in db.processed_df.columns:
        print("WARNING: processed_df is empty or missing columns!")
        return {
            "timestamp_ms": js_timestamp_ms,
            "target_satellite": None,
            "fleet_positions": {}
        }

    target_row = db.processed_df[db.processed_df['NORAD_CAT_ID'] == target_norad_id]
    target_satellite_data = None

    if not target_row.empty:
        target_satellite_dict = target_row.iloc[0].to_dict()
        target_sat = EarthSatellite.from_omm(ts, target_satellite_dict)
        target_state = target_sat.at(current_time)

        target_satellite_data = {
            "norad_id": target_sat.model.satnum,
            "data": target_state.position.km.tolist() + target_state.velocity.km_per_s.tolist() 
        }

    fleet_sats = [EarthSatellite.from_omm(ts, sat_dict) for sat_dict in db.processed_df.to_dict(orient="records")]
    fleet_positions = {}

    for sat in fleet_sats:
        state = sat.at(current_time)
        norad_id = sat.model.satnum
        fleet_positions[norad_id] = state.position.km.tolist() + state.velocity.km_per_s.tolist()

    return {
        "timestamp_ms": js_timestamp_ms,
        "target_satellite": target_satellite_data,
        "fleet_positions": fleet_positions
    }


"""
# Optional: Keep this for local testing
if __name__ == "__main__":
    # Test with a known ID like 902
    data = get_satellite_states(902)
    print("Test Run Successful. Target ID:", data.get("target_satellite", {}).get("norad_id"))

"""