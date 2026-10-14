import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.feedback.gemini_interpreter import generate_deterministic_coaching

client = TestClient(app)

def test_health_endpoints():
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True

    r_models = client.get("/api/health/models")
    assert r_models.status_code == 200
    assert "vad_status" in r_models.json()

def test_deterministic_coaching_fallback():
    flaws = [{
        "flaw_id": "flaw_test_1",
        "category": "excessive_speaking_rate",
        "start_seconds": 1.0,
        "end_seconds": 2.5,
        "text_segment": "rushed phrase",
        "reference_value": 135.0,
        "participant_value": 190.0,
        "unit": "wpm",
        "deviation_percent": 40.7,
        "severity": "high",
        "explanation": "Pacing was too fast.",
        "recommendation": "Slow down."
    }]
    rubric = {
        "dimensions": [
            {"dimension": "Pacing & Rhythm", "score": 65.0, "justification": "Rushed phrase detected."}
        ]
    }

    res = generate_deterministic_coaching("Persuasive Oratory", 75.0, flaws, rubric)
    assert res["is_deterministic_fallback"] is True
    assert len(res["interpretations"]) == 1
    assert res["interpretations"][0]["flaw_id"] == "flaw_test_1"
    assert "drill" in res["interpretations"][0]["practice_exercise"].lower() or "practice" in res["interpretations"][0]["practice_exercise"].lower()
    assert len(res["strengths"]) > 0

def test_settings_api():
    r = client.get("/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert "weight_pacing" in data

    # Update setting
    r_up = client.post("/api/settings", json={"weight_pacing": 0.30})
    assert r_up.status_code == 200
    assert r_up.json()["weight_pacing"] == 0.30

    # Reset back
    client.post("/api/settings", json={"weight_pacing": 0.25})

def test_sample_analysis_and_report_export():
    # 1. Trigger sample analysis endpoint (Hamlet)
    r_sample = client.post("/api/analyses/sample?sample_key=script_1")
    assert r_sample.status_code == 200
    data = r_sample.json()
    analysis_id = data["analysis_id"]
    assert data["status"] == "completed"
    assert data["overall_score"] is not None

    # 2. Query detail
    r_detail = client.get(f"/api/analyses/{analysis_id}")
    assert r_detail.status_code == 200
    detail = r_detail.json()
    assert detail["status"] == "completed"
    assert len(detail["flaws"]) > 0
    assert detail["participant_features"] is not None
    assert detail["rubric_score"] is not None

    # 3. Export JSON report
    r_rep_json = client.get(f"/api/analyses/{analysis_id}/report?format=json")
    assert r_rep_json.status_code == 200
    assert r_rep_json.json()["id"] == analysis_id

    # 4. Export CSV report
    r_rep_csv = client.get(f"/api/analyses/{analysis_id}/report?format=csv")
    assert r_rep_csv.status_code == 200
    assert "Counterpoint AI" in r_rep_csv.text

    # 5. Check dashboard summary reflects analysis
    r_dash = client.get("/api/dashboard/summary")
    assert r_dash.status_code == 200
    dash_data = r_dash.json()
    assert dash_data["total_analyses"] >= 1
    assert dash_data["average_delivery_score"] > 0
