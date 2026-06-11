"""
LedgerPro ML Service — FastAPI microservice
Provides ML-powered endpoints for:
  - Transaction categorization
  - SMS/bank statement parsing
  - Anomaly detection
  - Spending prediction
  - Merchant decoding
"""

import os
import re
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="LedgerPro ML Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

# ─── Model Cache ─────────────────────────────────────────────────────────

_models = {}

def load_model(name):
    if name not in _models:
        path = os.path.join(MODELS_DIR, name)
        _models[name] = joblib.load(path)
    return _models[name]

def get_categorizer():
    return load_model('transaction_categorizer.pkl')

def get_sms_tfidf():
    return load_model('sms_tfidf.pkl')

def get_sms_amount():
    return load_model('sms_amount_model.pkl')

def get_sms_merchant():
    return load_model('sms_merchant_model.pkl')

def get_sms_merchant_labels():
    return load_model('sms_merchant_labels.pkl')

def get_sms_category():
    return load_model('sms_category_model.pkl')

def get_sms_category_labels():
    return load_model('sms_category_labels.pkl')

def get_sms_type():
    return load_model('sms_type_model.pkl')

def get_anomaly_detector():
    return load_model('anomaly_detector.pkl')

def get_anomaly_scaler():
    return load_model('anomaly_scaler.pkl')

def get_spending_predictor():
    return load_model('spending_predictor.pkl')

# ─── Request/Response Models ────────────────────────────────────────────

class CategorizeRequest(BaseModel):
    text: str
    description: Optional[str] = None
    merchant: Optional[str] = None

class CategorizeResponse(BaseModel):
    category: str
    confidence: float
    probabilities: dict

class ParseSMSRequest(BaseModel):
    raw_text: str

class ParseSMSResponse(BaseModel):
    amount: float
    merchant: str
    category: str
    type: str
    date: str
    confidence: float
    merchant_confidence: float
    category_confidence: float

class AnomalyRequest(BaseModel):
    transactions: List[dict]

class AnomalyItem(BaseModel):
    amount: float
    frequency: Optional[float] = 1.0
    category_index: Optional[float] = 0.5
    hour: Optional[float] = 0.5
    day_of_week: Optional[float] = 0.5

class AnomalyResponse(BaseModel):
    anomalies: List[dict]
    anomaly_scores: List[float]
    is_anomaly: List[bool]

class PredictRequest(BaseModel):
    days_ahead: int = 30
    current_day: Optional[int] = None

class PredictResponse(BaseModel):
    predictions: List[float]
    days: List[int]

class HealthResponse(BaseModel):
    status: str
    models_loaded: list
    version: str

# ─── Helper Functions ────────────────────────────────────────────────────

def merge_text(text, description, merchant):
    parts = [str(text or ''), str(description or ''), str(merchant or '')]
    return ' '.join(p.strip() for p in parts if p.strip())

def safe_predict_proba(model, X):
    try:
        probs = model.predict_proba(X)
        return probs[0]
    except Exception:
        return None

# ─── Endpoints ───────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health_check():
    model_dir = MODELS_DIR
    available = [f for f in os.listdir(model_dir) if f.endswith('.pkl')]
    return HealthResponse(
        status="healthy",
        models_loaded=available,
        version="2.0.0"
    )

@app.post("/categorize", response_model=CategorizeResponse)
def categorize(req: CategorizeRequest):
    try:
        model = get_categorizer()
        text = merge_text(req.text, req.description, req.merchant)
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text provided")

        proba = model.predict_proba([text])[0]
        pred = model.predict([text])[0]
        confidence = float(max(proba))

        with open(os.path.join(MODELS_DIR, 'categories_meta.json')) as f:
            categories = json.load(f)
        probabilities = {categories[str(i)]: float(p) for i, p in enumerate(proba)}

        return CategorizeResponse(
            category=pred,
            confidence=confidence,
            probabilities=probabilities
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/parse-sms", response_model=ParseSMSResponse)
def parse_sms(req: ParseSMSRequest):
    try:
        text = req.raw_text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")

        tfidf = get_sms_tfidf()
        X = tfidf.transform([text])

        amount_model = get_sms_amount()
        merchant_model = get_sms_merchant()
        cat_model = get_sms_category()
        type_model = get_sms_type()
        merchant_le = get_sms_merchant_labels()
        cat_le = get_sms_category_labels()

        amount_pred = float(amount_model.predict(X)[0])
        amount_pred = max(0, round(amount_pred, 2))

        merchant_pred_idx = merchant_model.predict(X)[0]
        merchant_pred = merchant_le.inverse_transform([merchant_pred_idx])[0]
        merchant_proba = float(max(merchant_model.predict_proba(X)[0]))

        cat_idx = cat_model.predict(X)[0]
        cat_pred = cat_le.inverse_transform([cat_idx])[0]
        cat_proba = float(max(cat_model.predict_proba(X)[0]))

        type_pred = type_model.predict(X)[0]
        type_proba = float(max(type_model.predict_proba(X)[0]))

        date_match = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', text)
        if date_match:
            date_str = f"{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}"
        else:
            date_str = datetime.now().strftime('%Y-%m-%d')

        confidence = (merchant_proba * 0.3 + cat_proba * 0.3 + type_proba * 0.2 + min(amount_pred / 10000, 1) * 0.2)

        return ParseSMSResponse(
            amount=amount_pred,
            merchant=merchant_pred,
            category=cat_pred,
            type='CREDIT' if type_pred == 'CREDIT' else 'DEBIT',
            date=date_str,
            confidence=round(confidence, 3),
            merchant_confidence=round(merchant_proba, 3),
            category_confidence=round(cat_proba, 3)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-anomalies", response_model=AnomalyResponse)
def detect_anomalies(req: AnomalyRequest):
    try:
        detector = get_anomaly_detector()
        scaler = get_anomaly_scaler()

        if not req.transactions:
            return AnomalyResponse(anomalies=[], anomaly_scores=[], is_anomaly=[])

        features = []
        for tx in req.transactions:
            amt = float(tx.get('amount', 0))
            features.append([
                amt,
                np.log1p(amt),
                float(tx.get('frequency', 1)),
                float(tx.get('category_index', 0.5)),
                float(tx.get('hour', 0.5)),
                float(tx.get('day_of_week', 0.5)),
            ])

        X = np.array(features)
        X_scaled = scaler.transform(X)
        scores = detector.score_samples(X_scaled)
        predictions = detector.predict(X_scaled)

        anomalies = []
        is_anomaly_list = []
        for i, (tx, score, pred) in enumerate(zip(req.transactions, scores, predictions)):
            is_anom = bool(pred == -1)
            is_anomaly_list.append(is_anom)
            if is_anom:
                anomalies.append({
                    'index': i,
                    'transaction': tx,
                    'anomaly_score': float(score),
                    'severity': 'high' if score < -0.5 else 'medium',
                })

        return AnomalyResponse(
            anomalies=anomalies,
            anomaly_scores=[float(s) for s in scores],
            is_anomaly=is_anomaly_list
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-spending", response_model=PredictResponse)
def predict_spending(req: PredictRequest):
    try:
        model = get_spending_predictor()
        current_day = req.current_day or 0

        days = list(range(current_day, current_day + req.days_ahead))
        X_pred = pd.DataFrame({
            'day': days,
            'day_of_week': [d % 7 for d in days],
            'is_weekend': [1 if d % 7 >= 5 else 0 for d in days],
            'day_of_month': [(d % 30) + 1 for d in days],
            'is_month_end': [1 if (d % 30) >= 27 else 0 for d in days],
        })

        predictions = model.predict(X_pred)
        predictions = [max(0, round(p, 2)) for p in predictions]

        return PredictResponse(predictions=predictions, days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Budget Recommendation Models ─────────────────────────────────────────

class BudgetRecommendRequest(BaseModel):
    avg_spending: dict  # e.g. {"Food": 7500, "Transport": 3500}

class BudgetRecommendItem(BaseModel):
    category: str
    suggested_limit: float
    historical_avg: float
    rationale: str
    confidence: str

class BudgetRecommendResponse(BaseModel):
    recommendations: List[BudgetRecommendItem]
    total_suggested: float
    monthly_income_estimate: Optional[float] = None

# Budget allocation heuristics
BUDGET_WEIGHTS = {
    'Food': 0.25, 'Transport': 0.10, 'Shopping': 0.15,
    'Bills': 0.12, 'Health': 0.08, 'Entertainment': 0.05,
    'Education': 0.06, 'Groceries': 0.12, 'Utilities': 0.07,
    'Dining': 0.08, 'Rent': 0.20, 'Insurance': 0.05,
    'Salary': 0.0, 'Income': 0.0
}

@app.post("/recommend-budgets", response_model=BudgetRecommendResponse)
def recommend_budgets(req: BudgetRecommendRequest):
    try:
        if not req.avg_spending:
            raise HTTPException(status_code=400, detail="No spending data provided")

        total_avg = sum(req.avg_spending.values())
        recommendations = []
        total_suggested = 0

        for category, avg in sorted(req.avg_spending.items(), key=lambda x: -x[1]):
            weight = BUDGET_WEIGHTS.get(category, 0.08)
            income_based = total_avg * weight
            historical_based = avg * 1.1
            suggested = max(income_based, historical_based)

            if avg > 0:
                ratio = suggested / avg
                if ratio > 1.3:
                    rationale = f"Recommended {suggested:.0f} (+{((ratio-1)*100):.0f}% buffer above your {avg:.0f} avg)"
                    confidence = "medium"
                elif ratio > 1.1:
                    rationale = f"Set at {suggested:.0f}, {((ratio-1)*100):.0f}% above your {avg:.0f} monthly average"
                    confidence = "high"
                else:
                    rationale = f"Matches your typical {avg:.0f}/month spending"
                    confidence = "high"
            else:
                rationale = f"No historical data — default {suggested:.0f} suggested"
                confidence = "low"

            recommendations.append(BudgetRecommendItem(
                category=category,
                suggested_limit=round(suggested, -1),
                historical_avg=round(avg, 2),
                rationale=rationale,
                confidence=confidence
            ))
            total_suggested += round(suggested, -1)

        return BudgetRecommendResponse(
            recommendations=recommendations,
            total_suggested=total_suggested,
            monthly_income_estimate=total_avg
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Portfolio Analysis Models ────────────────────────────────────────────

class PortfolioAnalysisRequest(BaseModel):
    holdings: List[dict]

class PortfolioAnalysisResponse(BaseModel):
    diversification_score: float
    risk_level: str
    sector_concentration: list
    recommendations: list
    sharpe_ratio_estimate: Optional[float] = None

@app.post("/portfolio/analyze", response_model=PortfolioAnalysisResponse)
def analyze_portfolio(req: PortfolioAnalysisRequest):
    try:
        if not req.holdings:
            return PortfolioAnalysisResponse(
                diversification_score=0, risk_level="unknown",
                sector_concentration=[], recommendations=["Add holdings to analyze your portfolio."]
            )

        total = sum(h.get('currentValue', h.get('quantity', 0) * h.get('currentPrice', 0)) for h in req.holdings)
        if total == 0:
            return PortfolioAnalysisResponse(
                diversification_score=0, risk_level="unknown",
                sector_concentration=[], recommendations=["No portfolio value detected."]
            )

        # Sector concentration
        sector_map = {}
        for h in req.holdings:
            sec = h.get('sector', 'Other')
            val = h.get('currentValue', h.get('quantity', 0) * h.get('currentPrice', 0))
            sector_map[sec] = sector_map.get(sec, 0) + val

        sector_concentration = sorted(
            [{"sector": k, "value": round(v, 2), "pct": round(v / total * 100, 1)} for k, v in sector_map.items()],
            key=lambda x: -x["pct"]
        )

        # HHI (Herfindahl-Hirschman Index) for concentration
        hhi = sum((v / total * 100) ** 2 for v in sector_map.values())
        diversification_score = round(max(0, min(100, 100 - hhi / 2)), 1)

        # Risk level
        if hhi > 3000: risk_level = "very_high"
        elif hhi > 2000: risk_level = "high"
        elif hhi > 1200: risk_level = "moderate"
        elif hhi > 600: risk_level = "low"
        else: risk_level = "very_low"

        # Recommendations
        recs = []
        if len(req.holdings) < 3:
            recs.append("Consider diversifying across at least 3-5 different stocks to reduce single-stock risk.")
        if any(s["pct"] > 40 for s in sector_concentration):
            dominant = [s for s in sector_concentration if s["pct"] > 40][0]
            recs.append(f"Your {dominant['sector']} sector allocation ({dominant['pct']}%) is very high. Consider balancing into other sectors.")
        if risk_level == "very_high":
            recs.append("Portfolio is heavily concentrated. Rebalancing is strongly recommended to reduce risk.")
        if not recs:
            recs.append("Your portfolio is well-diversified. Maintain current allocation with periodic rebalancing.")
        recs.append("Review holdings quarterly and rebalance when any sector exceeds 30% of total.")

        # Rough Sharpe estimate from P&L data
        pnl_values = [h.get('pnl', h.get('pnlPct', 0)) for h in req.holdings]
        avg_return = sum(pnl_values) / len(pnl_values) if pnl_values else 0
        sharpe = round(avg_return / (max(np.std(pnl_values), 0.01)), 2) if len(pnl_values) > 1 else None

        return PortfolioAnalysisResponse(
            diversification_score=diversification_score,
            risk_level=risk_level,
            sector_concentration=sector_concentration,
            recommendations=recs,
            sharpe_ratio_estimate=sharpe
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('ML_PORT', 5050))
    print(f"[ML Service] Starting on port {port}...")
    uvicorn.run(app, host='0.0.0.0', port=port)
