# data_processor.py
import pandas as pd
import numpy as np
import os
import joblib
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report

# Paths
DATASET_PATH = r"C:\Users\harshini\Downloads\accident prediction\archive (4)"
MODEL_PATH = 'accident_prediction_model.pkl'

def load_dataset():
    try:
        if not os.path.exists(DATASET_PATH):
            print(f"Dataset directory not found: {DATASET_PATH}")
            return None

        csv_files = [f for f in os.listdir(DATASET_PATH) if f.endswith('.csv')]
        if not csv_files:
            print(f"No CSV files found in {DATASET_PATH}")
            return None

        data_file = os.path.join(DATASET_PATH, csv_files[0])
        print(f"Loading dataset from {data_file}")

        df = pd.read_csv(data_file, low_memory=False)
        print(f"Loaded dataset with {df.shape[0]} rows and {df.shape[1]} columns")
        return df
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return None

def preprocess_dataset(df):
    try:
        if df is None or df.empty:
            return None

        processed_df = df.copy()

        for col in processed_df.columns:
            if processed_df[col].dtype == 'object':
                processed_df[col] = processed_df[col].fillna('Unknown')
            else:
                processed_df[col] = processed_df[col].fillna(-1)

        print("Available columns in dataset:", processed_df.columns.tolist())

        # Define expected columns
        expected_columns = {
            'location': ['latitude', 'longitude'],
            'time': ['Time', 'Date'],
            'weather': ['Weather_Conditions'],
            'severity': ['Accident_Severity'],
            'road_type': ['Road_Type']
        }

        feature_df = pd.DataFrame()

        # Process location
        feature_df['latitude'] = processed_df['latitude']
        feature_df['longitude'] = processed_df['longitude']

        # Combine Date and Time columns to form a datetime
        try:
            processed_df['datetime'] = pd.to_datetime(processed_df['Date'] + ' ' + processed_df['Time'], errors='coerce')
        except Exception as e:
            print(f"Datetime conversion error: {e}")
            processed_df['datetime'] = pd.to_datetime('2000-01-01 12:00:00')

        # Extract time-based features
        feature_df['hour'] = processed_df['datetime'].dt.hour
        feature_df['day_of_week'] = processed_df['datetime'].dt.dayofweek
        feature_df['is_weekend'] = (feature_df['day_of_week'] >= 5).astype(int)
        feature_df['is_rush_hour'] = (((feature_df['hour'] >= 7) & (feature_df['hour'] <= 9)) | 
                                      ((feature_df['hour'] >= 17) & (feature_df['hour'] <= 19))).astype(int)
        feature_df['is_night'] = (((feature_df['hour'] >= 22) | (feature_df['hour'] <= 5))).astype(int)

        # Process weather
        feature_df['weather_risk'] = 0.0
        weather_col = 'Weather_Conditions'
        weather_mapping = {
            'rain': 0.3,
            'snow': 0.5,
            'fog': 0.4,
            'storm': 0.6,
            'mist': 0.2,
            'drizzle': 0.3,
            'clear': 0,
            'fair': 0,
            'cloudy': 0.1,
            'overcast': 0.1
        }

        if weather_col in processed_df.columns:
            for weather_type, risk in weather_mapping.items():
                mask = processed_df[weather_col].astype(str).str.lower().str.contains(weather_type, na=False)
                feature_df.loc[mask, 'weather_risk'] = risk

        # Target (severity)
        if 'Accident_Severity' in processed_df.columns:
            max_sev = processed_df['Accident_Severity'].max()
            feature_df['target'] = (processed_df['Accident_Severity'] > (max_sev / 2)).astype(int)
        else:
            feature_df['target'] = 1

        print(f"Created feature dataset with {feature_df.shape[0]} rows and {feature_df.shape[1]} columns")
        return feature_df
    except Exception as e:
        print(f"Error preprocessing dataset: {e}")
        return None

def train_model(feature_df):
    try:
        if feature_df is None or feature_df.empty:
            return None

        X = feature_df.drop('target', axis=1)
        y = feature_df['target']

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        model = RandomForestClassifier(n_estimators=100, random_state=42)
        print("Training model...")
        model.fit(X_train_scaled, y_train)

        y_pred = model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        print(f"Model accuracy: {accuracy:.4f}")
        print(classification_report(y_test, y_pred))

        joblib.dump({
            'model': model,
            'scaler': scaler,
            'feature_names': X.columns.tolist()
        }, MODEL_PATH)

        print(f"Model saved to {MODEL_PATH}")
        return model
    except Exception as e:
        print(f"Error training model: {e}")
        return None

def nearest_points(lat, lng, df, n=5):
    try:
        if df is None or df.empty:
            return []

        df['distance'] = np.sqrt((df['latitude'] - lat)**2 + (df['longitude'] - lng)**2)
        return df.sort_values('distance').head(n)
    except Exception as e:
        print(f"Error finding nearest points: {e}")
        return []

def add_real_world_data(hotspots, user_lat, user_lng):
    try:
        df = load_dataset()
        if df is None:
            return hotspots

        feature_df = preprocess_dataset(df)
        if feature_df is None:
            return hotspots

        for hotspot in hotspots:
            lat = hotspot['latitude']
            lng = hotspot['longitude']
            nearest = nearest_points(lat, lng, feature_df)

            if not nearest.empty:
                hotspot['real_data'] = {
                    'nearest_incidents': len(nearest),
                    'avg_distance_km': float(nearest['distance'].mean() * 111),
                    'time_patterns': {
                        'morning': int(nearest[nearest['hour'].between(5, 11)].shape[0]),
                        'afternoon': int(nearest[nearest['hour'].between(12, 16)].shape[0]),
                        'evening': int(nearest[nearest['hour'].between(17, 21)].shape[0]),
                        'night': int(nearest[(nearest['hour'] >= 22) | (nearest['hour'] <= 4)].shape[0])
                    },
                    'weekend_incidents': int(nearest[nearest['is_weekend'] == 1].shape[0])
                }

                incidents_weight = min(len(nearest) / 10, 1)
                hotspot['risk_factor'] = (hotspot['risk_factor'] * 0.7) + (incidents_weight * 0.3)
                hotspot['risk_level'] = get_risk_level(hotspot['risk_factor'])

        return hotspots
    except Exception as e:
        print(f"Error adding real-world data: {e}")
        return hotspots

def get_risk_level(risk_factor):
    if risk_factor >= 0.8:
        return 'very high'
    elif risk_factor >= 0.6:
        return 'high'
    elif risk_factor >= 0.4:
        return 'moderate'
    elif risk_factor >= 0.2:
        return 'low'
    else:
        return 'very low'

if __name__ == '__main__':
    df = load_dataset()
    if df is not None:
        feature_df = preprocess_dataset(df)
        if feature_df is not None:
            train_model(feature_df)
