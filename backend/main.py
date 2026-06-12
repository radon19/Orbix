import httpx
import json
import logging
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from skyfield.api import load

# ── Visualization Imports ─────────────────────────────────────────────────────
from states import get_satellite_states

# ── Collision Threat Imports ──────────────────────────────────────────────────
# Import as a module so we can access and mutate the live database state
import data.dataframe as db
from phase_one.reduced_data import get_reduced_catalog
from phase_two.get_threats import find_conjunctions
from phase_three.end import process_alerts

# ── Initialization ────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Orbix Tracker & Threat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ts = load.timescale()

class ThreatRequest(BaseModel):
    norad_id: int

# api (can/will use spacetrack in future)
CELESTRAK_SOURCES = {
    "active.json": "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json",
    "debris.json": "https://celestrak.org/NORAD/elements/gp.php?NAME=DEB&FORMAT=json",
    "rocket.json": "https://celestrak.org/NORAD/elements/gp.php?NAME=R%2FB&FORMAT=json",
    "lastdays.json": "https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=json"
}

# Determine the absolute path to the data folder so files save correctly
DATA_DIR = Path(__file__).parent / "data"

async def download_file(client: httpx.AsyncClient, filename: str, url: str):
    """Downloads a single file and saves it directly to the /data directory."""
    try:
        logger.info(f"Fetching data from {url}...")
        response = await client.get(url, timeout=60.0)
        response.raise_for_status() 
        
        new_data = response.json()
        
        if new_data and len(new_data) > 0:
            file_path = DATA_DIR / filename
            with open(file_path, "w", encoding="utf-8") as file:
                json.dump(new_data, file, indent=4)
            
            msg = f"Updated successfully with {len(new_data)} records."
            logger.info(f"{filename}: {msg}")
            return filename, msg
        else:
            msg = "Skipped: Fetched data was empty."
            logger.warning(f"{filename}: {msg}")
            return filename, msg
            
    except httpx.HTTPStatusError as e:
        msg = f"Failed: HTTP error {e.response.status_code}"
        logger.error(f"{filename}: {msg}")
        return filename, msg
    except Exception as e:
        msg = f"Failed: Unexpected error ({str(e)})"
        logger.error(f"{filename}: {msg}")
        return filename, msg

async def fetch_and_store_data():
    """Fetches all Celestrak data concurrently for maximum speed."""
    # Ensure the data directory exists
    DATA_DIR.mkdir(exist_ok=True)
    
    async with httpx.AsyncClient() as client:
        # Launch all 4 downloads at the exact same time
        tasks = [download_file(client, fname, url) for fname, url in CELESTRAK_SOURCES.items()]
        completed_tasks = await asyncio.gather(*tasks)
        
    return {fname: msg for fname, msg in completed_tasks}


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.post("/trigger-update")
async def trigger_update():
    """
    Endpoint that waits for the data fetch process to complete concurrently, 
    reloads the backend memory, and returns a summary message.
    """
    fetch_results = await fetch_and_store_data()
    
    # CRITICAL: Tell Pandas to reload the fresh JSON files into memory!
    db.reload_data()
    
    return {
        "status": "completed", 
        "message": "Data fetching has finished and live memory has been updated.",
        "details": fetch_results
    }


@app.get("/globe")
def get_globe_data(target_norad_id: int = Query(..., description="NORAD ID of the target satellite")):
    data = get_satellite_states(target_norad_id)
    
    if data["target_satellite"] is None:
        raise HTTPException(
            status_code=404, 
            detail=f"Target satellite with NORAD ID {target_norad_id} not found in database."
        )
    return data


@app.post("/api/threats")
def check_threats(request: ThreatRequest):
    # Reference the dynamic dataframe using the module prefix
    if db.processed_df.empty:
        raise HTTPException(status_code=500, detail="Satellite database is empty or not loaded.")
        
    now = ts.now()
    
    target_sat, threat_sats = get_reduced_catalog(db.processed_df, request.norad_id, ts)
    if not target_sat:
        raise HTTPException(status_code=404, detail=f"Target NORAD ID {request.norad_id} not found.")
        
    alerts = find_conjunctions(target_sat, threat_sats, ts, now)
    evaluated_threats = process_alerts(alerts)
    
    return {
        "target_norad_id": request.norad_id,
        "threats_found": len(evaluated_threats),
        "threats": evaluated_threats
    }