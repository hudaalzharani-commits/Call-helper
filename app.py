from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
import math
import pandas as pd

from Logic import get_agent_for_user

app = Flask(__name__)
CORS(app)

# Home page
@app.get("/")
def index():
    return render_template("index.html")


def _safe_val(v):
    if v is None:
        return None
    try:
        if isinstance(v, float) and math.isnan(v):
            return None
    except Exception:
        pass
    return v


@app.post("/api/resolve")
def api_resolve():
    try:
        data = request.get_json(force=True) or {}
        name = (data.get("name") or "").strip()
        user_type = (data.get("user_type") or "").strip()
        issue = (data.get("issue") or "").strip()

        if not user_type or not issue:
            return jsonify({
                "success": False,
                "message": "Missing required fields: user_type and issue",
            }), 400

        agent = get_agent_for_user(user_type)
        if agent is None:
            return jsonify({
                "success": False,
                "message": "Unsupported user type for now.",
            }), 400

        best_row, status_msg = agent.find_best_row(issue)
        if best_row is None:
            return jsonify({
                "success": False,
                "message": status_msg,
            }), 200

        # Extract fields safely
        resp = {
            "success": True,
            "message": status_msg,
            "customer": name,
            "user_type": user_type,
            "match": {
                "case_id": _safe_val(best_row.get("CaseID")),
                "category": _safe_val(best_row.get("Category")),
                "subcategory": _safe_val(best_row.get("SubCategory")),
                "priority": _safe_val(best_row.get("Priorty")),  # note: source typo
                "score": _safe_val(best_row.get("MatchScore")),
                "response_text": _safe_val(best_row.get("ResponseText")),
                "fallback": _safe_val(best_row.get("FallbackText")),
                "why": _safe_val(best_row.get("Why")),
                "last_updated": _safe_val(best_row.get("LastUpdated")),
            }
        }
        return jsonify(resp)

    except Exception as e:
        # Avoid leaking stack trace to clients
        return jsonify({
            "success": False,
            "message": "Internal server error",
        }), 500


if __name__ == "__main__":
    # For local development
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
