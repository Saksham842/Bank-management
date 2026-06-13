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

# ─── Net Worth Analysis Models ───────────────────────────────────────────

class NetWorthProjectRequest(BaseModel):
    current_net_worth: float
    monthly_savings: float = 0
    annual_growth_rate: float = 8.0
    years: int = 10

class NetWorthProjectResponse(BaseModel):
    projections: List[dict]
    summary: dict

@app.post("/networth/project", response_model=NetWorthProjectResponse)
def project_net_worth(req: NetWorthProjectRequest):
    try:
        years = max(1, min(req.years, 50))
        growth = req.annual_growth_rate / 100
        monthly = req.monthly_savings
        current = req.current_net_worth

        projections = []
        for y in range(1, years + 1):
            # Compound growth + monthly contributions
            balance = current
            for m in range(12):
                balance = balance * (1 + growth / 12) + monthly
            current = balance
            projections.append({
                "year": y,
                "netWorth": round(balance, 2),
                "yearLabel": f"Year {y}"
            })

        summary = {
            "starting": round(req.current_net_worth, 2),
            "final": round(projections[-1]["netWorth"], 2) if projections else 0,
            "totalContributed": round(req.monthly_savings * 12 * years, 2),
            "growthEarned": round(projections[-1]["netWorth"] - req.current_net_worth - req.monthly_savings * 12 * years, 2) if projections else 0,
            "yearsProjected": years
        }
        return NetWorthProjectResponse(projections=projections, summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class NetWorthAnalyzeRequest(BaseModel):
    assets: List[dict]
    total_liabilities: float = 0

class NetWorthAnalyzeResponse(BaseModel):
    health_score: float
    liquidity_ratio: float
    diversification_score: float
    recommendations: list

@app.post("/networth/analyze", response_model=NetWorthAnalyzeResponse)
def analyze_net_worth(req: NetWorthAnalyzeRequest):
    try:
        if not req.assets:
            return NetWorthAnalyzeResponse(health_score=0, liquidity_ratio=0, diversification_score=0, recommendations=["No assets tracked."])

        total = sum(a.get('value', 0) for a in req.assets)
        if total == 0:
            return NetWorthAnalyzeResponse(health_score=0, liquidity_ratio=0, diversification_score=0, recommendations=["No asset value detected."])

        liquid = sum(a.get('value', 0) for a in req.assets if a.get('liquid'))
        liquidity_ratio = round(liquid / total * 100, 1) if total > 0 else 0

        # Calculate HHI for diversification
        type_values = {}
        for a in req.assets:
            t = a.get('type', 'other')
            type_values[t] = type_values.get(t, 0) + a.get('value', 0)
        hhi = sum((v / total * 100) ** 2 for v in type_values.values())
        diversification_score = round(max(0, min(100, 100 - hhi / 2)), 1)

        # Health score components
        liquid_score = min(30, liquidity_ratio * 2)
        diversity_score = diversification_score * 0.4
        liability_ratio = req.total_liabilities / total if total > 0 else 0
        liability_score = max(0, 30 - liability_ratio * 100)
        health_score = round(min(100, liquid_score + diversity_score + liability_score), 1)

        recs = []
        if liquidity_ratio < 15:
            recs.append("Liquid assets are below 15%. Aim to keep 3-6 months of expenses in cash/bank accounts.")
        if diversification_score < 40:
            recs.append("Portfolio is concentrated. Consider diversifying across real estate, investments, and cash.")
        if liability_ratio > 0.5:
            recs.append("Liabilities exceed 50% of assets. Focus on debt reduction.")
        if not recs:
            recs.append("Healthy asset allocation. Continue building wealth with consistent savings.")
        recs.append("Review and rebalance asset allocation annually.")

        return NetWorthAnalyzeResponse(
            health_score=health_score,
            liquidity_ratio=liquidity_ratio,
            diversification_score=diversification_score,
            recommendations=recs
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('ML_PORT', 5050))
    print(f"[ML Service] Starting on port {port}...")
    uvicorn.run(app, host='0.0.0.0', port=port)
