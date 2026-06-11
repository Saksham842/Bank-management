"""
Train all ML models for the LedgerPro ML service.
Generates synthetic financial data and trains scikit-learn models.
"""
import numpy as np
import pandas as pd
import joblib
import os
import json
import re
from datetime import datetime, timedelta
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder

np.random.seed(42)
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# ─── Synthetic Data Generators ────────────────────────────────────────────

MERCHANTS = {
    'Food': ['Zomato', 'Swiggy', 'Dominos', 'KFC', 'McDonalds', 'Starbucks', 'Pizza Hut', 'Burger King', 'Subway', 'Local Cafe', 'Restaurant', 'Dhaba', 'Hotel Grand', 'Food Truck', 'Bakingo'],
    'Transport': ['Uber', 'Ola', 'Indian Oil', 'BPCL', 'HPCL', 'Metro', 'IRCTC', 'RedBus', 'MakeMyTrip', 'Air India', 'Indigo', 'Cab Fare', 'Parking', 'Toll Naka', 'Rapido'],
    'Entertainment': ['Netflix', 'Amazon Prime', 'Spotify', 'Hotstar', 'PVR', 'INOX', 'BookMyShow', 'YouTube Premium', 'Steam', 'PlayStation', 'Xbox', 'Gaana', 'JioSaavn', 'Game Zone', 'Multiplex'],
    'Healthcare': ['Apollo Pharmacy', 'MedPlus', 'NetMeds', '1mg', 'Practo', 'Hospital', 'Clinic', 'Dental Care', 'Eye Checkup', 'Pharmacy', 'Health Insurance', 'Diagnostic Center', 'Doctor Visit', 'Medicine', 'Surgery'],
    'Shopping': ['Amazon', 'Flipkart', 'Myntra', 'AJIO', 'Meesho', 'Nykaa', 'Croma', 'Reliance Digital', 'Lifestyle', 'Shoppers Stop', 'Westside', 'Decathlon', 'D-Mart', 'BigBasket', 'Blinkit'],
    'Utilities': ['Electricity Board', 'Water Dept', 'Gas Agency', 'Jio Fiber', 'Airtel', 'BSNL', 'Broadband', 'Mobile Recharge', 'DTH', 'House Rent', 'Insurance Premium', 'Society Maintenance', 'Property Tax', 'Internet Bill', 'Credit Card Bill'],
    'Salary': ['Employer Salary', 'Freelance Income', 'Consulting', 'Dividend', 'Interest Credit', 'Bonus', 'Commission', 'Refund', 'Reimbursement', 'Rental Income', 'Capital Gains', 'Business Income', 'Stipend', 'Pension', 'Royalty'],
    'Investment': ['Zerodha', 'Groww', 'Upstox', 'Angel Broking', 'Mutual Fund SIP', 'Fixed Deposit', 'PPF', 'NPS', 'Gold ETF', 'Crypto', 'Stock Purchase', 'Bond', 'ULIP', 'REIT', 'Sovereign Gold'],
}

SMS_TEMPLATES = {
    'Food': [
        "Rs.{amount} debited from a/c XX1234 on {date} at {merchant}. Available bal: Rs.{bal}.",
        "Transaction Alert: Rs.{amount} spent at {merchant} on {date}. Avl Bal INR {bal}.",
        "Payment of Rs.{amount} to {merchant} successful on {date}. Thanks for using Card.",
        "INR {amount} paid to {merchant} via UPI on {date}. Ref: {ref}.",
        "{amount} INR debited at {merchant}. Date: {date}. Balance: INR {bal}.",
    ],
    'Transport': [
        "Rs.{amount} paid to {merchant} for ride on {date}. Trip fare includes GST.",
        "Fuel purchase of Rs.{amount} at {merchant} on {date}. Card ending 1234.",
        "Ticket booking Rs.{amount} confirmed with {merchant} on {date}. PNR: {ref}.",
        "{amount} INR charged for {merchant} trip on {date}. Receipt #{ref}.",
        "UPI payment of Rs.{amount} to {merchant} on {date} completed.",
    ],
    'Entertainment': [
        "Subscription: Rs.{amount} debited for {merchant} on {date}. Auto-pay enabled.",
        "Rs.{amount} paid to {merchant} for monthly plan on {date}. Valid till next month.",
        "Payment of INR {amount} to {merchant} successful. Date: {date}.",
        "{merchant}: Rs.{amount} charged on {date}. Thanks for your purchase.",
        "Recurring payment of Rs.{amount} to {merchant} on {date}.",
    ],
    'Healthcare': [
        "Rs.{amount} paid at {merchant} on {date}. Medicine purchase confirmed.",
        "Healthcare expense: INR {amount} at {merchant} on {date}. Receipt #{ref}.",
        "Consultation fee Rs.{amount} paid to {merchant} on {date}.",
        "{amount} INR debited for {merchant} visit on {date}. Health is wealth!",
        "Pharmacy purchase of Rs.{amount} at {merchant} on {date}.",
    ],
    'Shopping': [
        "Rs.{amount} spent at {merchant} on {date}. Order confirmed. Track #{ref}.",
        "Your {merchant} order of INR {amount} on {date} is confirmed.",
        "Payment of Rs.{amount} to {merchant} on {date}. Delivery expected in 3 days.",
        "Debited INR {amount} for {merchant} purchase on {date}. Avl balance: Rs.{bal}.",
        "{merchant} order #{ref}: Rs.{amount} charged on {date}.",
    ],
    'Utilities': [
        "Bill payment of Rs.{amount} to {merchant} on {date} successful. Receipt #{ref}.",
        "Auto-debit: Rs.{amount} paid to {merchant} on {date}. Next due: next month.",
        "INR {amount} debited for {merchant} bill on {date}. Thanks for timely payment.",
        "Utility bill of Rs.{amount} paid to {merchant} on {date}. No due now.",
        "Recurring bill Rs.{amount} charged by {merchant} on {date}.",
    ],
    'Salary': [
        "CREDIT: Rs.{amount} credited to a/c XX1234 from {merchant} on {date}. Balance: Rs.{bal}.",
        "Salary credited: INR {amount} from {merchant} on {date}. Avl bal: INR {bal}.",
        "Refund of Rs.{amount} received from {merchant} on {date}. Credited to account.",
        "INR {amount} credited by {merchant} on {date}. Balance: INR {bal}.",
        "Dividend payment of Rs.{amount} from {merchant} on {date} credited.",
    ],
    'Investment': [
        "SIP investment: Rs.{amount} debited to {merchant} on {date}. Units allocated.",
        "Stock purchase of Rs.{amount} for {merchant} on {date}. Trade confirmed.",
        "INR {amount} invested in {merchant} on {date}. Current NAV update shortly.",
        "FD renewal of Rs.{amount} with {merchant} on {date}. Maturity in 1 year.",
        "Recurring deposit Rs.{amount} to {merchant} on {date} completed.",
    ],
}

def generate_sms(category, amount, merchant, days_ago, ref_id):
    date = (datetime.now() - timedelta(days=days_ago)).strftime('%d/%m/%Y')
    bal = np.random.randint(5000, 50000)
    template = np.random.choice(SMS_TEMPLATES[category])
    return template.format(amount=amount, merchant=merchant, date=date, bal=bal, ref=ref_id)

def generate_training_data(n_samples=10000):
    data = []
    categories = list(MERCHANTS.keys())
    for _ in range(n_samples):
        cat = np.random.choice(categories, p=[0.17, 0.13, 0.10, 0.08, 0.15, 0.12, 0.15, 0.10])
        merchant = np.random.choice(MERCHANTS[cat])
        if cat == 'Salary':
            amount = round(np.random.uniform(10000, 150000), 2)
        elif cat == 'Investment':
            amount = round(np.random.uniform(500, 50000), 2)
        elif cat == 'Food':
            amount = round(np.random.uniform(50, 3000), 2)
        elif cat == 'Transport':
            amount = round(np.random.uniform(20, 5000), 2)
        else:
            amount = round(np.random.uniform(100, 25000), 2)

        days_ago = np.random.randint(0, 365)
        ref_id = f'TXN{np.random.randint(100000, 999999)}'
        sms_text = generate_sms(cat, amount, merchant, days_ago, ref_id)
        tx_type = 'CREDIT' if cat == 'Salary' else 'DEBIT'

        data.append({
            'text': sms_text,
            'description': f"{tx_type} of Rs.{amount} at {merchant}",
            'category': cat,
            'type': tx_type,
            'amount': amount,
            'merchant': merchant,
        })
    return pd.DataFrame(data)

# ─── 1. Transaction Categorizer ──────────────────────────────────────────

def train_categorizer():
    print("[ML] Training Transaction Categorizer...")
    df = generate_training_data(15000)

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 3),
            sublinear_tf=True,
            stop_words='english'
        )),
        ('clf', LogisticRegression(
            C=1.5,
            max_iter=1000,
            multi_class='multinomial',
            class_weight='balanced'
        ))
    ])

    X_text = df['text'] + ' ' + df['description'] + ' ' + df['merchant']
    y = df['category']

    X_train, X_test, y_train, y_test = train_test_split(X_text, y, test_size=0.2, random_state=42)
    pipeline.fit(X_train, y_train)
    accuracy = pipeline.score(X_test, y_test)
    print(f"  Categorizer accuracy: {accuracy:.3f}")

    label_encoder = LabelEncoder()
    label_encoder.fit(y)

    joblib.dump(pipeline, os.path.join(MODELS_DIR, 'transaction_categorizer.pkl'))
    joblib.dump(label_encoder, os.path.join(MODELS_DIR, 'category_labels.pkl'))

    categories_meta = {i: cat for i, cat in enumerate(label_encoder.classes_)}
    with open(os.path.join(MODELS_DIR, 'categories_meta.json'), 'w') as f:
        json.dump(categories_meta, f)

    print(f"  Saved to {MODELS_DIR}")
    return pipeline, label_encoder

# ─── 2. SMS Parser ───────────────────────────────────────────────────────

def train_sms_parser():
    print("[ML] Training SMS Parser...")
    df = generate_training_data(20000)

    X_text = df['text']
    y_amount = df['amount']
    y_merchant = df['merchant']
    y_category = df['category']
    y_type = df['type']

    tfidf = TfidfVectorizer(max_features=3000, ngram_range=(1, 2), sublinear_tf=True)
    X = tfidf.fit_transform(X_text)

    amount_model = Ridge(alpha=1.0)
    amount_model.fit(X, y_amount)
    amount_score = amount_model.score(X, y_amount)
    print(f"  Amount predictor R²: {amount_score:.3f}")

    merchant_model = LogisticRegression(max_iter=1000, multi_class='multinomial')
    all_merchants = []
    for mlist in MERCHANTS.values():
        all_merchants.extend(mlist)
    merchant_le = LabelEncoder()
    merchant_le.fit(all_merchants)
    y_merchant_enc = merchant_le.transform(y_merchant)
    merchant_model.fit(X, y_merchant_enc)
    print(f"  Merchant classifier trained on {len(merchant_le.classes_)} merchants")

    cat_le = LabelEncoder()
    y_cat_enc = cat_le.fit_transform(y_category)
    cat_model = LogisticRegression(max_iter=1000, multi_class='multinomial', class_weight='balanced')
    cat_model.fit(X, y_cat_enc)
    cat_score = cat_model.score(X, y_cat_enc)
    print(f"  Category classifier accuracy: {cat_score:.3f}")

    type_model = RandomForestClassifier(n_estimators=100, class_weight='balanced')
    type_model.fit(X, y_type)
    type_score = type_model.score(X, y_type)
    print(f"  Type classifier accuracy: {type_score:.3f}")

    joblib.dump(tfidf, os.path.join(MODELS_DIR, 'sms_tfidf.pkl'))
    joblib.dump(amount_model, os.path.join(MODELS_DIR, 'sms_amount_model.pkl'))
    joblib.dump(merchant_model, os.path.join(MODELS_DIR, 'sms_merchant_model.pkl'))
    joblib.dump(merchant_le, os.path.join(MODELS_DIR, 'sms_merchant_labels.pkl'))
    joblib.dump(cat_model, os.path.join(MODELS_DIR, 'sms_category_model.pkl'))
    joblib.dump(cat_le, os.path.join(MODELS_DIR, 'sms_category_labels.pkl'))
    joblib.dump(type_model, os.path.join(MODELS_DIR, 'sms_type_model.pkl'))

    print(f"  Saved SMS parser models to {MODELS_DIR}")
    return tfidf, amount_model, merchant_model, cat_model, type_model, merchant_le, cat_le

# ─── 3. Anomaly Detector ─────────────────────────────────────────────────

def train_anomaly_detector():
    print("[ML] Training Anomaly Detector...")
    np.random.seed(42)
    n_normal = 8000
    n_anomalies = 200

    normal_amounts = np.random.lognormal(mean=6.5, sigma=1.0, size=n_normal)
    normal_freq = np.random.poisson(lam=3, size=n_normal)
    normal_cat_dist = np.random.dirichlet(np.ones(8), size=n_normal)

    anomaly_amounts = np.concatenate([
        np.random.uniform(50000, 500000, size=n_anomalies // 2),
        np.random.uniform(1, 10, size=n_anomalies // 2),
    ])
    anomaly_freq = np.random.poisson(lam=15, size=n_anomalies)

    X_normal = np.column_stack([
        normal_amounts,
        np.log1p(normal_amounts),
        normal_freq,
        np.random.uniform(0, 1, size=n_normal),
        np.random.uniform(0, 1, size=n_normal),
        np.random.uniform(0, 1, size=n_normal),
    ])

    X_anomaly = np.column_stack([
        anomaly_amounts,
        np.log1p(anomaly_amounts),
        anomaly_freq,
        np.random.uniform(0.8, 1.0, size=n_anomalies),
        np.random.uniform(0.8, 1.0, size=n_anomalies),
        np.random.uniform(0.0, 0.2, size=n_anomalies),
    ])

    X = np.vstack([X_normal, X_anomaly])
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    iso_forest = IsolationForest(
        n_estimators=200,
        contamination=0.03,
        random_state=42,
        bootstrap=True
    )
    iso_forest.fit(X_scaled)

    scores = iso_forest.score_samples(X_scaled)
    anomaly_mask = scores < np.percentile(scores, 3)
    n_detected = np.sum(anomaly_mask)
    print(f"  Anomaly detector trained. Will flag ~{n_detected} out of {len(X)} ({100*n_detected/len(X):.1f}%)")

    joblib.dump(iso_forest, os.path.join(MODELS_DIR, 'anomaly_detector.pkl'))
    joblib.dump(scaler, os.path.join(MODELS_DIR, 'anomaly_scaler.pkl'))
    print(f"  Saved anomaly detector to {MODELS_DIR}")

    return iso_forest, scaler

# ─── 4. Spending Predictor ────────────────────────────────────────────────

def train_spending_predictor():
    print("[ML] Training Spending Predictor...")
    np.random.seed(42)
    n_users = 100
    n_days = 180

    records = []
    for user in range(n_users):
        base_spend = np.random.uniform(200, 2000)
        trend = np.random.uniform(-2, 3)

        for day in range(n_days):
            day_of_week = day % 7
            weekend_boost = 1.3 if day_of_week >= 5 else 1.0
            noise = np.random.normal(0, base_spend * 0.3)
            spend = max(0, base_spend + trend * day + noise) * weekend_boost

            records.append({
                'day': day,
                'day_of_week': day_of_week,
                'is_weekend': 1 if day_of_week >= 5 else 0,
                'day_of_month': (day % 30) + 1,
                'is_month_end': 1 if (day % 30) >= 27 else 0,
                'spend': spend,
            })

    df = pd.DataFrame(records)
    features = ['day', 'day_of_week', 'is_weekend', 'day_of_month', 'is_month_end']
    X = df[features]
    y = df['spend']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42)
    y_binned = pd.qcut(y_train, q=20, labels=False, duplicates='drop')
    model.fit(X_train, y_binned)

    X_scaler = StandardScaler()
    X_scaled_all = X_scaler.fit_transform(X)

    y_scaler = StandardScaler()
    y_scaled = y_scaler.fit_transform(y.values.reshape(-1, 1)).ravel()

    ridge = Ridge(alpha=0.5)
    ridge.fit(X_train, y_train)
    ridge_score = ridge.score(X_test, y_test)
    print(f"  Spending predictor R²: {ridge_score:.3f}")

    joblib.dump(ridge, os.path.join(MODELS_DIR, 'spending_predictor.pkl'))
    joblib.dump(X_scaler, os.path.join(MODELS_DIR, 'spending_scaler.pkl'))
    joblib.dump(y_scaler, os.path.join(MODELS_DIR, 'spending_y_scaler.pkl'))
    print(f"  Saved spending predictor to {MODELS_DIR}")

    return ridge, X_scaler, y_scaler

# ─── Main ─────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("=" * 60)
    print("LedgerPro ML Model Training")
    print("=" * 60)
    print()

    train_categorizer()
    print()
    train_sms_parser()
    print()
    train_anomaly_detector()
    print()
    train_spending_predictor()
    print()
    print("=" * 60)
    print("All models trained successfully!")
    print(f"Models saved to: {MODELS_DIR}")
    print("=" * 60)
