import numpy as np
import pandas as pd
from data.data_filter import load_raw_data

MU = 398600.4418
EARTH_RADIUS = 6378.137  

def get_processed_dataframe() -> pd.DataFrame:
    df = load_raw_data()
    
    if df.empty:
        return df

    mean_motion_rad_s = df['MEAN_MOTION'] * (2 * np.pi / 86400)
    semi_major_axis = (MU / (mean_motion_rad_s ** 2)) ** (1/3)
    
    df['PERIGEE'] = semi_major_axis * (1 - df['ECCENTRICITY']) - EARTH_RADIUS
    df['APOGEE']  = semi_major_axis * (1 + df['ECCENTRICITY']) - EARTH_RADIUS
    print(len(df))
    
    return df

processed_df = get_processed_dataframe()




def reload_data():
    """Forces the application to drop the old dataframe and load the fresh JSON files."""
    global processed_df
    processed_df = get_processed_dataframe()