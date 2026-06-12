import json
import pandas as pd
from pathlib import Path

def load_raw_data() -> pd.DataFrame:
     
    current_dir = Path(__file__).parent
    files = [
        "active.json",
        "debris.json",
        "rocket.json",
        "lastdays.json",
    ]

    frames = []
    for file_name in files:
        file_path = current_dir / file_name
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                frames.append(pd.DataFrame(json.load(f)))

    if not frames:
        return pd.DataFrame()

    df = pd.concat(frames, ignore_index=True)
    df.drop_duplicates(subset="NORAD_CAT_ID", keep="first", inplace=True)
    df.reset_index(drop=True, inplace=True)
    
    return df