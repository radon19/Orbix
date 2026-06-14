import json
import time
from skyfield.api import load

# Import your Orbix engine modules
import data.dataframe as db
from phase_one.reduced_data import get_reduced_catalog
from phase_two.get_threats import find_conjunctions

def run_accuracy_test():
    start_time = time.time()
    print("🚀 Initiating Orbix vs. Space-Track Accuracy Test (Local JSON)...")

    # 1. Ensure local database is loaded
    if db.processed_df.empty:
        print("Loading local CelesTrak database...")
        db.reload_data()

    # 2. Load the downloaded JSON file
    print("📂 Loading acc.json...")
    try:
        with open('acc.json', 'r') as f:
            cdm_data = json.load(f)
    except FileNotFoundError:
        print("❌ Error: acc.json not found. Make sure it is in the exact same folder as this script!")
        return

    # Extract unique target satellites (up to 100, adapts dynamically if fewer)
    unique_targets = list(set([int(cdm['SAT_1_ID']) for cdm in cdm_data]))[:100]
    total_targets = len(unique_targets)
    print(f"✅ Locked in {total_targets} unique target satellites for testing.\n")

    # 3. Process and compare
    ts = load.timescale()
    now = ts.now()
    
    deltas = []
    
    for idx, target_id in enumerate(unique_targets, 1):
        print(f"⚙️ Processing Target {idx}/{total_targets} [NORAD: {target_id}]...")
        
        # Get all Space-Track CDMs for this specific target
        st_threats_for_target = [cdm for cdm in cdm_data if int(cdm['SAT_1_ID']) == target_id]
        
        # Run the local Orbix Engine
        target_sat, threat_sats = get_reduced_catalog(db.processed_df, target_id, ts)
        if not target_sat:
            continue
            
        local_alerts = find_conjunctions(target_sat, threat_sats, ts, now)
        
        # Cross-reference local results with Space-Track results
        for st_cdm in st_threats_for_target:
            threat_id = int(st_cdm['SAT_2_ID'])
            
            # Space-Track MIN_RNG is in METERS. Convert to KM.
            st_miss_km = float(st_cdm['MIN_RNG']) / 1000.0 
            
            # Find if Orbix caught the same threat
            orbix_match = next((alert for alert in local_alerts if alert["THREAT_NORAD_ID"] == threat_id), None)
            
            if orbix_match:
                orbix_miss_km = orbix_match["MISS_DISTANCE_KM"]
                error_margin_km = abs(st_miss_km - orbix_miss_km)
                
                deltas.append(error_margin_km)
                print(f"   🎯 Threat ID: {threat_id}")
                print(f"      Space-Track : {st_miss_km:.4f} km")
                print(f"      Orbix       : {orbix_miss_km:.4f} km")
                print(f"      Delta Error : {error_margin_km:.4f} km\n")

    # 4. Output Final Metrics
    execution_time = (time.time() - start_time) / 60
    
    if deltas:
        avg_error = sum(deltas) / len(deltas)
        max_error = max(deltas)
        min_error = min(deltas)
        print("📊 --- FINAL ACCURACY METRICS ---")
        print(f"Total Conjunctions Cross-Checked: {len(deltas)}")
        print(f"Average Miss Distance Error:      {avg_error:.4f} km")
        print(f"Maximum Error Divergence:         {max_error:.4f} km")
        print(f"Minimum Error Divergence:         {min_error:.4f} km")
        print(f"Total Execution Time:             {execution_time:.2f} minutes")
        print("--------------------------------")
    else:
        print("No matching conjunctions found under the 15km critical threshold.")

if __name__ == "__main__":
    run_accuracy_test()