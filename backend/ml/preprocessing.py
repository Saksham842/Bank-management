import re
import numpy as np

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def tokenize(text):
    return clean_text(text).split()

def extract_amount_features(text):
    features = np.zeros(6)
    amounts = re.findall(r'(?:rs\.?\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?)', str(text).lower())
    if amounts:
        val = float(amounts[0].replace(',', ''))
        features[0] = min(val / 100000, 1.0)
        features[1] = 1.0 if val > 10000 else 0.0
        features[2] = 1.0 if val < 100 else 0.0
    features[3] = 1.0 if re.search(r'(credit|credited|received|salary|refund|deposit|earned|income)', text.lower()) else 0.0
    features[4] = 1.0 if re.search(r'(debit|debited|spent|paid|payment|purchase)', text.lower()) else 0.0
    features[5] = 1.0 if re.search(r'(balance|available|avl)', text.lower()) else 0.0
    return features

def extract_date_features(text):
    features = np.zeros(3)
    features[0] = 1.0 if re.search(r'\d{2}[-/]\d{2}[-/]\d{4}', text) else 0.0
    features[1] = 1.0 if re.search(r'(today|yesterday|now|just)', text.lower()) else 0.0
    features[2] = 1.0 if re.search(r'(on|dated|dt)', text.lower()) else 0.0
    return features

CATEGORY_KEYWORDS = {
    'Food': ['zomato', 'swiggy', 'restaurant', 'cafe', 'pizza', 'burger', 'food', 'hotel', 'dining', 'starbucks', 'kfc', 'mcdonald', 'eat', 'lunch', 'dinner', 'breakfast', 'grocery', 'supermarket'],
    'Transport': ['uber', 'ola', 'cab', 'taxi', 'metro', 'train', 'bus', 'flight', 'fuel', 'petrol', 'diesel', 'travel', 'toll', 'parking', 'rapido', 'auto'],
    'Entertainment': ['netflix', 'spotify', 'prime', 'movie', 'cinema', 'pvr', 'inox', 'bookmyshow', 'hotstar', 'game', 'gaming', 'concert', 'pub', 'club', 'youtube'],
    'Healthcare': ['hospital', 'doctor', 'clinic', 'pharmacy', 'medicine', 'medical', 'dentist', 'apollo', 'medplus', 'health', 'surgery', 'diagnostic'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'mall', 'store', 'shopping', 'lifestyle', 'clothing', 'electronics', 'nykaa', 'meesho', 'croma', 'reliance'],
    'Utilities': ['electricity', 'water', 'gas', 'wifi', 'internet', 'broadband', 'recharge', 'bill', 'rent', 'insurance', 'subscription', 'jio', 'airtel'],
    'Salary': ['salary', 'stipend', 'income', 'paycheck', 'wages', 'bonus', 'dividend', 'payout', 'credit salary'],
    'Investment': ['stock', 'mutual', 'sip', 'invest', 'crypto', 'bitcoin', 'share', 'trading', 'fd', 'ppf', 'nps', 'saving'],
}

def keyword_features(text):
    text_lower = str(text).lower()
    cats = sorted(CATEGORY_KEYWORDS.keys())
    features = np.zeros(len(cats))
    for i, cat in enumerate(cats):
        score = sum(1 for kw in CATEGORY_KEYWORDS[cat] if kw in text_lower)
        features[i] = min(score / 5.0, 1.0)
    return features

def extract_all_features(text):
    text_clean = clean_text(text)
    amt_feat = extract_amount_features(text)
    date_feat = extract_date_features(text)
    kw_feat = keyword_features(text)
    text_len = np.array([min(len(text_clean) / 200, 1.0)])
    return np.concatenate([amt_feat, date_feat, kw_feat, text_len])
