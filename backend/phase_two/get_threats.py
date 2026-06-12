import numpy as np

MINUTES_IN_DAY = 1440
COARSE_THRESHOLD_KM = 1000.0
CRITICAL_THRESHOLD_KM = 15.0
COARSE_THRESH_SQ = COARSE_THRESHOLD_KM ** 2
CRITICAL_THRESH_SQ = CRITICAL_THRESHOLD_KM ** 2
WINDOW_BUFFER_SEC = 120 

def find_conjunctions(target_sat, threat_sats, ts, now):
    coarse_minutes = np.arange(0, MINUTES_IN_DAY, 1)
    coarse_times = ts.tt_jd(now.tt + (coarse_minutes / 1440.0))
    
    target_coarse = target_sat.at(coarse_times).position.km

    candidates_with_windows = []
    for threat_sat in threat_sats:
        threat_coarse = threat_sat.at(coarse_times).position.km
        delta = target_coarse - threat_coarse
        dist_sq = np.einsum('ij,ij->j', delta, delta) 
        
        violation_idx = np.where(dist_sq < COARSE_THRESH_SQ)[0]

        if len(violation_idx) > 0:
            split_points = np.where(np.diff(violation_idx) > 1)[0] + 1
            windows = np.split(violation_idx, split_points)
            candidates_with_windows.append((threat_sat, windows))

    alerts = []
    for threat_sat, windows in candidates_with_windows:
        for window in windows:
            start_sec = max(0, window[0] * 60 - WINDOW_BUFFER_SEC)
            end_sec = min(MINUTES_IN_DAY * 60, window[-1] * 60 + WINDOW_BUFFER_SEC)

            fine_seconds = np.arange(start_sec, end_sec + 1) 
            fine_times = ts.tt_jd(now.tt + (fine_seconds / 86400.0))

            target_fine = target_sat.at(fine_times).position.km
            threat_fine = threat_sat.at(fine_times).position.km

            delta_fine = target_fine - threat_fine
            dist_fine_sq = np.einsum('ij,ij->j', delta_fine, delta_fine)

            min_dist_sq = np.min(dist_fine_sq)

            if min_dist_sq < CRITICAL_THRESH_SQ:
                min_idx = np.argmin(dist_fine_sq)
                actual_km = np.sqrt(min_dist_sq)

                alerts.append({
                    "THREAT_NORAD_ID": threat_sat.model.satnum,
                    "THREAT_NAME": threat_sat.name,
                    "MISS_DISTANCE_KM": round(float(actual_km), 4),
                    "TCA_UTC": fine_times[min_idx].utc_strftime('%Y-%m-%d %H:%M:%S UTC')
                })

    return alerts