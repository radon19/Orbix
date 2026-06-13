import numpy as np

HBR_KM = 0.020
SIGMA_R_KM  = 0.050
SIGMA_T_KM  = 0.500
SIGMA_N_KM  = 0.050
SIGMA_COMBINED_KM = float(np.sqrt(SIGMA_R_KM**2 + SIGMA_T_KM**2 + SIGMA_N_KM**2))

def calculate_probability(miss_distance_km: float) -> float:
    sigma_sq = SIGMA_COMBINED_KM ** 2
    hbr_sq   = HBR_KM ** 2
    pc = (hbr_sq / (2.0 * sigma_sq)) * np.exp(-(miss_distance_km ** 2) / (2.0 * sigma_sq))
    return round(float(min(pc, 1.0)), 10)

def get_risk_level(probability: float, miss_distance_km: float) -> str:
    if miss_distance_km < 0.1 or probability >= 1e-4:
        return "CRITICAL"
    elif miss_distance_km < 1.0 or probability >= 1e-5:
        return "HIGH"
    elif miss_distance_km < 5.0 or probability >= 1e-6:
        return "MEDIUM"
    else:
        return "LOW"

def process_alerts(alerts: list) -> list:
    final_report = []
    
    for alert in alerts:
        prob = calculate_probability(alert["MISS_DISTANCE_KM"])
        risk = get_risk_level(prob, alert["MISS_DISTANCE_KM"])
        
        final_report.append({
            "norad_id": alert["THREAT_NORAD_ID"],
            "name": alert["THREAT_NAME"],
            "miss_distance_km": alert["MISS_DISTANCE_KM"],
            "tca_utc": alert["TCA_UTC"],
            "collision_probability": prob,
            "risk_level": risk
        })
        
    # Sort by miss distance so the most dangerous threats are first
    return sorted(final_report, key=lambda x: x["miss_distance_km"])