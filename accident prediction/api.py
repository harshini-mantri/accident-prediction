from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
import pickle
import os
import requests
from datetime import datetime
import joblib
from flask_cors import CORS
from flask_cors import cross_origin
# Import our data processor functions
from data_processor import add_real_world_data, load_dataset, preprocess_dataset, train_model
import traceback

app = Flask(__name__)
# Configure CORS properly to allow requests from your frontend
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# Constants
MODEL_PATH = 'accident_prediction_model.pkl'
OPEN_WEATHER_API_KEY = 'cfb2ef4201119b0955edec39d4e1f71b'

# Load the model if it exists, otherwise we'll use a fallback prediction method
model_data = None
if os.path.exists(MODEL_PATH):
    try:
        model_data = joblib.load(MODEL_PATH)
        model = model_data['model']
        scaler = model_data['scaler']
        feature_names = model_data['feature_names']
        print(f"Loaded prediction model from {MODEL_PATH}")
    except Exception as e:
        print(f"Error loading model: {e}")
        model = None
else:
    print(f"Model file {MODEL_PATH} not found. Will use fallback prediction.")
    # Try to train a new model
    print("Attempting to train a new model...")
    df = load_dataset()
    if df is not None:
        feature_df = preprocess_dataset(df)
        if feature_df is not None:
            model_data = train_model(feature_df)
            if model_data is not None:
                model = model_data['model']
                scaler = model_data['scaler']
                feature_names = model_data['feature_names']
            else:
                model = None
        else:
            model = None
    else:
        model = None

# Helper function to get weather risk factor
def get_weather_risk_factor(weather_main):
    """Calculate risk factor based on weather conditions"""
    if not weather_main:
        return 0
    
    weather = weather_main.lower()
    
    if 'rain' in weather or 'drizzle' in weather:
        return 0.3  # 30% increased risk
    elif 'snow' in weather:
        return 0.5  # 50% increased risk
    elif 'fog' in weather:
        return 0.4  # 40% increased risk
    elif 'storm' in weather:
        return 0.6  # 60% increased risk
    elif 'mist' in weather:
        return 0.2  # 20% increased risk
    
    return 0  # No increased risk for clear weather

# Helper function to get time-based risk factor
def get_time_risk_factor(hour, day):
    """Calculate risk factor based on time of day and day of week"""
    risk = 0
    
    # Rush hour risk (morning and evening)
    if (7 <= hour <= 9) or (17 <= hour <= 19):
        risk += 0.3
    
    # Late night risk
    if hour >= 23 or hour <= 5:
        risk += 0.2
    
    # Weekend risk
    if day == 5 or day == 6:  # 5 = Friday, 6 = Saturday
        if hour >= 20 or hour <= 2:  # Evening/night hours on weekends
            risk += 0.2
    
    return risk

# Generate grid points around a center location
def generate_grid_points(lat, lng, radius, num_points=10):
    """Generate a grid of points within a radius of the center point"""
    points = []
    
    # Create a grid of points
    for i in range(num_points):
        # Generate random angle
        angle = np.random.random() * 2 * np.pi
        
        # Generate random distance within radius (in km)
        distance = np.random.random() * radius
        
        # Convert distance and angle to lat/lng offsets
        # 0.009 degrees is approximately 1km in latitude
        lat_offset = np.cos(angle) * distance * 0.009
        lng_offset = np.sin(angle) * distance * 0.009 / np.cos(lat * np.pi / 180)
        
        # Calculate point location
        point_lat = lat + lat_offset
        point_lng = lng + lng_offset
        
        points.append((point_lat, point_lng))
    
    return points

# Get current weather for a location
def fetch_weather(lat, lng):
    """Fetch current weather conditions from OpenWeatherMap API"""
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={OPEN_WEATHER_API_KEY}&units=metric"
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            return {
                'main': data['weather'][0]['main'],
                'description': data['weather'][0]['description'],
                'temp': data['main']['temp'],
                'humidity': data['main']['humidity'],
                'wind_speed': data['wind']['speed'],
                'visibility': data.get('visibility', 10000)
            }
        else:
            print(f"Weather API error: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error fetching weather: {e}")
        return None

# Generate predictions using the ML model
def predict_with_model(features_df):
    """Use the ML model to predict accident risk"""
    try:
        if model_data is None:
            return None
        
        # Ensure features are in correct order
        features_df = features_df[feature_names]
        
        # Scale features
        features_scaled = scaler.transform(features_df)
        
        # Make predictions
        predictions = model.predict_proba(features_scaled)
        
        # Extract the probability of class 1 (accident)
        accident_probs = predictions[:, 1]
        
        return accident_probs
    except Exception as e:
        print(f"Error making predictions: {e}")
        return None

# Fallback prediction method when model is not available
def predict_fallback(lat, lng, weather, hour, day, is_highway=False):
    """Generate a synthetic prediction when the model is not available"""
    # Base probability between 0.5 and 0.7
    base_prob = 0.5 + np.random.random() * 0.2
    
    # Add weather factor
    weather_factor = get_weather_risk_factor(weather)
    
    # Add time factor
    time_factor = get_time_risk_factor(hour, day)
    
    # Calculate final probability
    probability = base_prob + (weather_factor * 0.1) + (time_factor * 0.1)
    
    # Adjust for road type
    if is_highway:
        probability += 0.1
    
    # Cap probability
    probability = min(probability, 0.95)
    
    return probability

@app.route('/api/predict-accidents', methods=['POST', 'OPTIONS'])
def predict_accidents():
    """API endpoint to predict accident hotspots"""
    # Handle OPTIONS request (preflight)
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        # Safely get data from request with appropriate error handling
        if not request.is_json:
            print("Request does not contain valid JSON")
            print(f"Content-Type: {request.headers.get('Content-Type')}")
            print(f"Raw data: {request.data}")
            return jsonify({'error': 'Request must be valid JSON with Content-Type: application/json'}), 400
        
        try:
            print(request.get_data())
            data = request.get_json()
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            print(f"Raw data: {request.data}")
            return jsonify({'error': 'Failed to parse JSON data'}), 400
        
        if not data:
            print("No data found in request")
            return jsonify({'error': 'No data found in request'}), 400
        
        # Get data from request
        lat = data.get('latitude')
        lng = data.get('longitude')
        radius = data.get('radius', 10)  # Default 10km radius
        weather_main = data.get('weather')
        hour = data.get('hour', datetime.now().hour)
        day = data.get('day', datetime.now().weekday())  # Default current day
        use_real_data = data.get('use_real_data', True)  # Default to using real data
        
        # Validate required parameters
        if lat is None or lng is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        # Convert string values to appropriate types if needed
        try:
            lat = float(lat)
            lng = float(lng)
            radius = float(radius)
            hour = int(hour)
            day = int(day)
        except (ValueError, TypeError) as e:
            print(f"Type conversion error: {e}")
            return jsonify({'error': 'Invalid parameter types. Latitude and longitude must be numbers.'}), 400
        
        # Generate grid points
        grid_points = generate_grid_points(lat, lng, radius)
        
        # Get weather if not provided
        if not weather_main:
            weather_data = fetch_weather(lat, lng)
            if weather_data:
                weather_main = weather_data.get('main')
        
        results = []
        
        # Process each grid point
        for point_lat, point_lng in grid_points:
            # If we have a model, use it
            if model:
                # Prepare features for model
                features = {
                    'latitude': point_lat,
                    'longitude': point_lng,
                    'hour': hour,
                    'day_of_week': day,
                    'is_weekend': 1 if day >= 5 else 0,
                    'is_rush_hour': 1 if (7 <= hour <= 9) or (17 <= hour <= 19) else 0,
                    'is_night': 1 if hour >= 22 or hour <= 5 else 0
                }
                
                # Add weather features if available
                if weather_main:
                    features['weather_risk'] = get_weather_risk_factor(weather_main)
                else:
                    features['weather_risk'] = 0
                
                # Convert to DataFrame
                features_df = pd.DataFrame([features])
                
                # Make prediction
                prediction = predict_with_model(features_df)
                if prediction is not None:
                    risk_factor = float(prediction[0])
                else:
                    # Fallback if model prediction fails
                    risk_factor = predict_fallback(point_lat, point_lng, weather_main, hour, day)
            else:
                # Use fallback prediction
                risk_factor = predict_fallback(point_lat, point_lng, weather_main, hour, day)
            print("predicting")
            # Add to results
            results.append({
                'latitude': point_lat,
                'longitude': point_lng,
                'risk_factor': risk_factor,
                'risk_level': get_risk_level(risk_factor)
            })
        
        # Incorporate real-world data if requested
        if use_real_data:
            results = add_real_world_data(results, lat, lng)
        
        # Sort results by risk factor (highest first)
        results = sorted(results, key=lambda x: x['risk_factor'], reverse=True)
        
        response_data = {
            'center': {'latitude': lat, 'longitude': lng},
            'radius': radius,
            'timestamp': datetime.now().isoformat(),
            'weather': weather_main,
            'using_real_data': use_real_data,
            'using_ml_model': model is not None,
            'hotspots': results
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        traceback.print_exc()
        print(f"Exception in predict_accidents: {str(e)}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

# Helper function to categorize risk levels
def get_risk_level(risk_factor):
    """Convert numerical risk factor to categorical risk level"""
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

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/weather', methods=['GET'])
def get_weather():
    """Get current weather for a location"""
    lat = request.args.get('latitude')
    lng = request.args.get('longitude')
    
    if not lat or not lng:
        return jsonify({'error': 'Latitude and longitude are required'}), 400
    
    try:
        lat = float(lat)
        lng = float(lng)
    except ValueError:
        return jsonify({'error': 'Invalid latitude or longitude format'}), 400
    
    weather_data = fetch_weather(lat, lng)
    
    if weather_data:
        return jsonify({
            'location': {'latitude': lat, 'longitude': lng},
            'weather': weather_data,
            'timestamp': datetime.now().isoformat()
        })
    else:
        return jsonify({'error': 'Failed to fetch weather data'}), 500

@app.route('/api/load-dataset', methods=['POST'])
def load_dataset_api():
    """API endpoint to load and process the dataset"""
    try:
        # Load the dataset
        df = load_dataset()
        if df is None:
            return jsonify({'error': 'Failed to load dataset'}), 500
        
        # Basic stats about the dataset
        stats = {
            'rows': df.shape[0],
            'columns': df.shape[1],
            'column_names': df.columns.tolist(),
            'sample_rows': df.head(5).to_dict(orient='records')
        }
        
        return jsonify({
            'status': 'success',
            'message': 'Dataset loaded successfully',
            'stats': stats
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/train-model', methods=['POST'])
def train_model_api():
    """API endpoint to train and save the model"""
    try:
        # Load the dataset
        df = load_dataset()
        if df is None:
            return jsonify({'error': 'Failed to load dataset'}), 500
        
        # Preprocess the dataset
        feature_df = preprocess_dataset(df)
        if feature_df is None:
            return jsonify({'error': 'Failed to preprocess dataset'}), 500
        
        # Train the model
        global model_data, model, scaler, feature_names
        model_data = train_model(feature_df)
        
        if model_data is None:
            return jsonify({'error': 'Failed to train model'}), 500
        
        # Update model variables
        model = model_data['model']
        scaler = model_data['scaler']
        feature_names = model_data['feature_names']
        
        return jsonify({
            'status': 'success',
            'message': 'Model trained and saved successfully',
            'model_info': {
                'feature_names': feature_names,
                'model_type': type(model).__name__
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))