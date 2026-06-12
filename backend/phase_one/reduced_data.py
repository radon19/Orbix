import pandas as pd
from skyfield.api import EarthSatellite

def get_reduced_catalog(df: pd.DataFrame, target_norad_id: int, ts):
    target_matches = df[df['NORAD_CAT_ID'] == target_norad_id]
    
    if target_matches.empty:
        return None, []

    target_row = target_matches.iloc[0]

    # delta = 50km
    DELTA_KM = 50.0
    condition_1 = df["PERIGEE"] <= (target_row["APOGEE"] + DELTA_KM)
    condition_2 = df["APOGEE"]  >= (target_row["PERIGEE"] - DELTA_KM)
    
    filtered_df = df[condition_1 & condition_2]
    filtered_df = filtered_df[filtered_df["NORAD_CAT_ID"] != target_norad_id]

    target_sat = EarthSatellite.from_omm(ts, target_row.to_dict())
    threat_sats = [EarthSatellite.from_omm(ts, row) for row in filtered_df.to_dict(orient="records")]

    return target_sat, threat_sats



#TEST

"""
ts = load.timescale()
current_time = ts.now()

# satellite_object = EarthSatellite.from_omm(ts, target_satellite_dict)

satellite_object = [EarthSatellite.from_omm(ts, sat_dict) for sat_dict in filtered_df.to_dict(orient="records")]

states = [sat.at(current_time) for sat in satellite_object]

#print("X, Y, Z Position (km):", states[0].position.km)
#print("X, Y, Z Velocity (km/s):", states[0].velocity.km_per_s)

states_positon = [sat.position.km for sat in states]
states_velocity = [sat.velocity.km_per_s for sat in states]

"""