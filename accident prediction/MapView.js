import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons - make sure these paths are correct for your project
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

// Fix Leaflet's default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Create custom icons for different alert types
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 1px 1px 2px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
};

// Pre-define the icons
const accidentIcon = createCustomIcon('red');
const weatherIcon = createCustomIcon('orange');
const trafficIcon = createCustomIcon('yellow');
const roadRiskIcon = createCustomIcon('#8B4513'); // Brown for road risk
const predictedAccidentIcon = createCustomIcon('#FF9999'); // Light red for predicted accident hotspots
const userDirectionIcon = (direction) => {
  return L.divIcon({
    className: 'user-direction-icon',
    html: `<div style="
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: blue;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${direction}deg);
            ">
            <div style="
              width: 0;
              height: 0;
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-bottom: 16px solid white;
              transform: translateY(-4px);
            "></div>
          </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

// MapUpdater component to handle live position updates
function MapUpdater({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, zoom);
    }
  }, [position, zoom, map]);
  return null;
}

function MapView({
  notificationRadius = 10,
  openWeatherApiKey = 'cfb2ef4201119b0955edec39d4e1f71b',
  tomTomApiKey = '0TNezXDad5B523FoWNYGvi2xDGbVJAvS',
  backendUrl = 'http://localhost:5000',
  updateInterval = 5000,
  voiceAlertsEnabled = true,
  alertVolume = 50
}) {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [alertLocations, setAlertLocations] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [predictedHotspots, setPredictedHotspots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [currentDay, setCurrentDay] = useState(new Date().getDay());
  
  // State variables for tracking movement
  const [userSpeed, setUserSpeed] = useState(0);
  const [userDirection, setUserDirection] = useState(0);
  const [userHeading, setUserHeading] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [consecutiveMovingReadings, setConsecutiveMovingReadings] = useState(0);
  const [realMovement, setRealMovement] = useState(false);
  const [lastPredictionUpdate, setLastPredictionUpdate] = useState(0);
  const [processingAlert, setProcessingAlert] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showSpeed, setShowSpeed] = useState(false);
  
  // Refs to track previous position and timestamp
  const prevPositionRef = useRef(null);
  const prevTimestampRef = useRef(null);
  const speedSamplesRef = useRef([]);
  const watchIdRef = useRef(null);
  const speechSynthRef = useRef(null);
  const audioContextRef = useRef(null);
  const lastTrafficUpdateRef = useRef(0);
  
  // Initialize speech synthesis and audio context
  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;
    }
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
      }
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
    
    return () => {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Function to speak messages with volume control
  const speakAlert = (message, priority = 'medium') => {
    if (!voiceAlertsEnabled || !speechSynthRef.current) return;
    
    speechSynthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(message);
    
    utterance.volume = alertVolume / 100;
    utterance.rate = priority === 'high' ? 1.1 : 1;
    utterance.pitch = priority === 'high' ? 1.2 : 1;
    
    const voices = speechSynthRef.current.getVoices();
    if (voices.length > 0) {
      const preferredVoice = voices.find(voice => 
        voice.name.includes('female') || 
        voice.name.includes('Samantha') || 
        voice.name.includes('Google')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }
    
    speechSynthRef.current.speak(utterance);
  };
  
  // Function to send SMS notification
  const sendSMSAlert = async (phoneNumber, message) => {
    try {
      const response = await axios.post(`${backendUrl}/api/send-sms`, {
        phoneNumber,
        message
      });
      
      console.log('SMS sent successfully:', response.data);
      return true;
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      return false;
    }
  };
  
  // Function to process critical alerts - voice and SMS
  const processCriticalAlert = async (alert) => {
    if (processingAlert) return;
    
    if (activeAlerts.some(a => a.id === alert.id)) {
      return;
    }
    
    setProcessingAlert(true);
    
    let alertMessage = '';
    
    if (alert.category === 'accident') {
      alertMessage = `Warning! Accident reported ${alert.distance} kilometers ahead.`;
    } else if (alert.category === 'weather') {
      alertMessage = `Caution! ${alert.message} ${alert.distance} kilometers ahead.`;
    } else if (alert.category === 'predicted_accident') {
      alertMessage = `Caution! High risk area ${alert.distance} kilometers ahead.`;
    } else {
      alertMessage = `Alert! ${alert.message} ${alert.distance} kilometers ahead.`;
    }
    
    if (voiceAlertsEnabled) {
      speakAlert(alertMessage, 'high');
    }
    
    const userPhoneNumber = localStorage.getItem('userPhoneNumber');
    
    if (userPhoneNumber) {
      await sendSMSAlert(userPhoneNumber, alertMessage);
    }
    
    setActiveAlerts(prev => {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      const filteredAlerts = prev.filter(a => a.timestamp > twoMinutesAgo);
      
      return [...filteredAlerts, {
        id: alert.id,
        timestamp: Date.now()
      }];
    });
    
    setTimeout(() => {
      setProcessingAlert(false);
    }, 5000);
  };
  
  // Start location tracking
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        error => {
          console.error('Error getting location:', error);
          setError('Unable to access your location. Please enable location services and refresh the page.');
          setIsLoading(false);
        },
        { 
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 50000
        }
      );
      
      watchIdRef.current = watchId;
      
      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation);
      }
      
      const now = new Date();
      setCurrentHour(now.getHours());
      setCurrentDay(now.getDay());
      
      const intervalId = setInterval(() => {
        if (currentPosition) {
          const now = Date.now();
          if (realMovement || (now - lastTrafficUpdateRef.current > 30000)) {
            fetchTrafficData(currentPosition[0], currentPosition[1]);
            lastTrafficUpdateRef.current = now;
          }
          
          if (now - lastPredictionUpdate > 60000 && currentPosition) { // Changed to update every minute
            generateAccidentPredictions(currentPosition[0], currentPosition[1]);
            setLastPredictionUpdate(now);
          }
        }
      }, updateInterval);
      
      // Initialize prediction data immediately when app loads
      // This ensures hotspots are shown from the start
      setTimeout(() => {
        if (currentPosition) {
          generateAccidentPredictions(currentPosition[0], currentPosition[1]);
        }
      }, 2000);
      
      return () => {
        navigator.geolocation.clearWatch(watchIdRef.current);
        window.removeEventListener('deviceorientation', handleOrientation);
        clearInterval(intervalId);
      };
    } else {
      setError('Geolocation is not supported by your browser.');
      setIsLoading(false);
    }
  }, []);
  
  // Process alerts for voice notifications
  useEffect(() => {
    if (realMovement && alertLocations.length > 0) {
      const criticalAlerts = alertLocations.filter(alert => isAlertCritical(alert));
      
      if (criticalAlerts.length > 0) {
        const closestAlert = criticalAlerts.sort((a, b) => 
          parseFloat(a.distance) - parseFloat(b.distance)
        )[0];
        
        processCriticalAlert(closestAlert);
      }
    }
  }, [alertLocations, realMovement]);
  
  // Handle device orientation events for better heading accuracy
  const handleOrientation = (event) => {
    if (event.webkitCompassHeading) {
      setUserHeading(event.webkitCompassHeading);
    } else if (event.alpha) {
      setUserHeading(360 - event.alpha);
    }
  };
  
  // Handle position updates from watchPosition
  const handlePositionUpdate = (position) => {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const timestamp = position.timestamp;
    
    setCurrentPosition([latitude, longitude]);
    
    let calculatedSpeed = 0;
    
    if (speed !== null && speed !== undefined) {
      calculatedSpeed = (speed * 3.6).toFixed(1);
    } else if (prevPositionRef.current && prevTimestampRef.current) {
      const prevLat = prevPositionRef.current[0];
      const prevLng = prevPositionRef.current[1];
      
      const distance = calculateDistance(prevLat, prevLng, latitude, longitude) * 1000;
      
      const timeDiff = (timestamp - prevTimestampRef.current) / 1000;
      
      if (timeDiff > 0) {
        calculatedSpeed = ((distance / timeDiff) * 3.6).toFixed(1);
      }
      
      const direction = calculateDirection(prevLat, prevLng, latitude, longitude);
      setUserDirection(direction);
    }
    
    speedSamplesRef.current.push(parseFloat(calculatedSpeed));
    
    if (speedSamplesRef.current.length > 5) {
      speedSamplesRef.current.shift();
    }
    
    const averageSpeed = speedSamplesRef.current.reduce((sum, speed) => sum + speed, 0) / 
                          speedSamplesRef.current.length;
    
    setUserSpeed(averageSpeed.toFixed(1));
    
    // Always show speed for testing - in real app you might want to keep the threshold
    setShowSpeed(true); // Changed from (averageSpeed > 3.0)
    
    if (heading !== null && heading !== undefined && !isNaN(heading)) {
      setUserHeading(heading);
    }
    
    const currentlyMoving = averageSpeed > 5.0;
    setIsMoving(currentlyMoving);
    
    if (currentlyMoving) {
      setConsecutiveMovingReadings(prev => prev + 1);
      if (consecutiveMovingReadings >= 3) {
        setRealMovement(true);
      }
    } else {
      setConsecutiveMovingReadings(0);
      if (consecutiveMovingReadings < 3) {
        setRealMovement(false);
      }
    }
    
    prevPositionRef.current = [latitude, longitude];
    prevTimestampRef.current = timestamp;
    
    if (isLoading) {
      fetchWeatherData(latitude, longitude);
      fetchTrafficData(latitude, longitude);
      generateAccidentPredictions(latitude, longitude);
      setIsLoading(false);
    }
  };
  
  // Helper function to calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  };
  
  // Helper function to convert degrees to radians
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };
  
  // Helper function to calculate direction angle in degrees
  const calculateDirection = (lat1, lon1, lat2, lon2) => {
    const dLon = deg2rad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(deg2rad(lat2));
    const x = Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
              Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLon);
    let brng = Math.atan2(y, x);
    brng = rad2deg(brng);
    return (brng + 360) % 360;
  };
  
  // Helper function to convert radians to degrees
  const rad2deg = (rad) => {
    return rad * (180/Math.PI);
  };

  const fetchWeatherData = async (lat, lng) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${openWeatherApiKey}&units=metric`
      );

      setWeatherData(response.data);

      if (response.data.weather && (
        response.data.weather[0].main.toLowerCase().includes('rain') ||
        response.data.weather[0].main.toLowerCase().includes('storm') ||
        response.data.weather[0].main.toLowerCase().includes('snow'))) {

        const weatherAlert = {
          id: 'weather-alert',
          lat: lat,
          lng: lng,
          type: 'weather',
          message: `Weather Alert: ${response.data.weather[0].description}`,
          category: 'weather',
          affectsRoadCondition: true,
          roadConditionEffect: getWeatherRoadEffect(response.data.weather[0].main),
          severity: 'medium'
        };

        setAlertLocations(prev => {
          const filteredAlerts = prev.filter(alert => alert.id !== 'weather-alert');
          return [...filteredAlerts, weatherAlert];
        });
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setError('Failed to fetch weather data. Please try again later.');
    }
  };

  // Helper function to determine road condition effects based on weather
  const getWeatherRoadEffect = (weatherMain) => {
    const weatherLower = weatherMain.toLowerCase();
    if (weatherLower.includes('rain') || weatherLower.includes('drizzle')) {
      return 'Wet and slippery roads';
    } else if (weatherLower.includes('snow')) {
      return 'Snow-covered roads, reduced traction';
    } else if (weatherLower.includes('fog')) {
      return 'Poor visibility';
    } else if (weatherLower.includes('storm')) {
      return 'Hazardous driving conditions, possible debris';
    } else if (weatherLower.includes('ice') || weatherLower.includes('sleet')) {
      return 'Icy roads, extremely slippery';
    }
    return 'Weather may affect driving conditions';
  };

  const fetchTrafficData = async (lat, lng) => {
    try {
      const latDelta = 0.045;
      const lngDelta = 0.045 / Math.cos(lat * Math.PI / 180);

      const minLat = lat - latDelta;
      const minLng = lng - lngDelta;
      const maxLat = lat + latDelta;
      const maxLng = lng + lngDelta;

      const response = await axios.get(
        `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${minLng},${minLat},${maxLng},${maxLat}&key=${tomTomApiKey}`
      );

      if (response.data && response.data.incidents) {
        generateAlerts(lat, lng, response.data.incidents);
      }
    } catch (error) {
      console.error('Error fetching traffic data:', error);
    }
  };

  const generateAlerts = (lat, lng, incidents) => {
    const alerts = incidents.map((incident, index) => {
      let alertLat = lat;
      let alertLng = lng;

      if (incident.point) {
        alertLat = incident.point.latitude;
        alertLng = incident.point.longitude;
      } else if (incident.geometry && incident.geometry.coordinates && incident.geometry.coordinates.length > 0) {
        const [lng, lat] = incident.geometry.coordinates[0];
        alertLat = lat;
        alertLng = lng;
      }

      let category = 'traffic';
      if (incident.type) {
        const type = incident.type.toUpperCase();
        if (type.includes('ACCIDENT') || type.includes('COLLISION')) {
          category = 'accident';
        } else if (type.includes('WEATHER') || type.includes('RAIN') ||
          type.includes('SNOW') || type.includes('STORM') ||
          type.includes('FOG') || type.includes('ICE')) {
          category = 'weather';
        }
      }

      const distance = calculateDistance(lat, lng, alertLat, alertLng);
      
      let isAhead = false;
      if (userHeading !== null) {
        const alertDirection = calculateDirection(lat, lng, alertLat, alertLng);
        const angleDiff = Math.abs((alertDirection - userHeading + 360) % 360);
        isAhead = angleDiff < 60 || angleDiff > 300;
      }

      return {
        id: `incident-${index}`,
        lat: alertLat,
        lng: alertLng,
        type: incident.type || 'UNKNOWN',
        message: incident.description || 'Traffic incident reported',
        severity: mapTomTomSeverityToLevel(incident.severity),
        category: category,
        distance: distance.toFixed(1),
        isAhead: isAhead
      };
    });

    setAlertLocations(prev => {
      const weatherAlerts = prev.filter(alert => alert.category === 'weather');
      const combined = [...weatherAlerts, ...alerts];
      const uniqueAlerts = Array.from(new Map(combined.map(alert => [alert.id, alert])).values());
      return uniqueAlerts;
    });
  };

  // Map TomTom severity to our severity levels
  const mapTomTomSeverityToLevel = (severity) => {
    if (!severity) return 'medium';

    const severityNum = parseInt(severity);
    if (severityNum >= 4) {
      return 'high';
    } else if (severityNum >= 2) {
      return 'medium';
    } else {
      return 'low';
    }
  };

  // Generate accident predictions around current location
  const generateAccidentPredictions = async (lat, lng) => {
    try {
      // First try to use the ML backend API
      try {
        // Make a request to your backend API to get predictions
        const response = await axios.post(`${backendUrl}/api/predict-accidents`, {
          latitude: lat,
          longitude: lng,
          radius: notificationRadius,
          weather: weatherData ? weatherData.weather[0].main : 'Clear',
          hour: currentHour,
          day: currentDay,
          speed: userSpeed,
          heading: userHeading
        });
        
        console.log("Got API prediction response:", response.data);
        
        // Check if the response contains predictions
        if (response.data) {
          // If response has hotspots, process them
          if (response.data.hotspots && Array.isArray(response.data.hotspots)) {
            // Convert from your ML API format to our frontend format
            const processedHotspots = response.data.hotspots.map((hotspot, index) => {
              // Calculate distance from user to hotspot
              const distance = calculateDistance(
                lat, lng, 
                hotspot.latitude, hotspot.longitude
              );
              
              // Calculate if the hotspot is ahead in the direction of travel
              let isAhead = false;
              if (userHeading !== null) {
                const hotspotDirection = calculateDirection(
                  lat, lng, 
                  hotspot.latitude, hotspot.longitude
                );
                const angleDiff = Math.abs((hotspotDirection - userHeading + 360) % 360);
                isAhead = angleDiff < 60 || angleDiff > 300; // Within a 120-degree cone in front
              }
              
              // Check if risk data is available
              let timePatterns = {morning: 0, afternoon: 0, evening: 0, night: 0};
              let avgDistance = 0;
              let nearestIncidents = 0;
              let weekendIncidents = 0;
              
              if (hotspot.real_data) {
                timePatterns = hotspot.real_data.time_patterns || timePatterns;
                avgDistance = hotspot.real_data.avg_distance_km || 0;
                nearestIncidents = hotspot.real_data.nearest_incidents || 0;
                weekendIncidents = hotspot.real_data.weekend_incidents || 0;
              }
              
              // Determine risk level description
              let riskLevelDesc = hotspot.risk_level || 'medium';
              if (typeof riskLevelDesc !== 'string') {
                if (hotspot.risk_factor > 0.7) riskLevelDesc = 'very high';
                else if (hotspot.risk_factor > 0.5) riskLevelDesc = 'high';
                else if (hotspot.risk_factor > 0.3) riskLevelDesc = 'medium';
                else riskLevelDesc = 'low';
              }
              
              // Return the processed hotspot in the format expected by the frontend
              return {
                id: `pred-api-${index}`,
                lat: hotspot.latitude,
                lng: hotspot.longitude,
                riskProbability: hotspot.risk_factor, // Use this as a number between 0-1
                riskLevel: riskLevelDesc,
                distance: distance.toFixed(1),
                isAhead: isAhead,
                factors: {
                  time: determineTimeFactor(timePatterns),
                  weekend: weekendIncidents > 0 ? 'Weekend risk' : 'Weekday risk',
                  incidents: `${nearestIncidents} nearby incidents`,
                  avgDistance: `Avg distance: ${avgDistance.toFixed(1)} km`,
                  weather: weatherData ? weatherData.weather[0].main : 'Clear'
                },
                category: 'predicted_accident'
              };
            });
            
            console.log("Processed hotspots:", processedHotspots);
            setPredictedHotspots(processedHotspots);
            return;
          }
        }
      } catch (apiError) {
        console.log('Could not connect to prediction API, using fallback prediction', apiError);
        // Fall through to fallback prediction
      }
      
      // If API call fails or returns no data, use fallback synthetic predictions
      console.log("Using fallback synthetic predictions");
      const syntheticPredictions = generateSyntheticPredictions(lat, lng, weatherData);
      setPredictedHotspots(syntheticPredictions);

    } catch (error) {
      console.error('Error generating accident predictions:', error);
    }
  };
  
  // Helper function to determine the most likely time pattern
  const determineTimeFactor = (timePatterns) => {
    if (!timePatterns) return 'Various times';
    
    const max = Math.max(
      timePatterns.morning || 0, 
      timePatterns.afternoon || 0,
      timePatterns.evening || 0, 
      timePatterns.night || 0
    );
    
    if (max <= 0) return 'Various times';
    
    if (timePatterns.morning === max) return 'Morning risk';
    if (timePatterns.afternoon === max) return 'Afternoon risk';
    if (timePatterns.evening === max) return 'Evening risk';
    if (timePatterns.night === max) return 'Night risk';
    
    return 'Various times';
  };

  // Fallback function to generate synthetic predictions if API is not available
  const generateSyntheticPredictions = (lat, lng, weatherData) => {
    // Number of prediction points to generate
    const numPoints = 10; // Increased from 5 to ensure more hotspots are visible

    // Get weather risk factor
    const weatherRiskFactor = getWeatherRiskFactor(weatherData);

    // Get time-based risk factor (rush hours, weekends, etc.)
    const timeRiskFactor = getTimeRiskFactor(currentHour, currentDay);
    
    // Get speed-based risk factor
    const speedRiskFactor = getSpeedRiskFactor(userSpeed);

    // Generate points in a radius around the user's location
    const syntheticPredictions = [];
    
    // If user is moving, concentrate more points in the direction of travel
    const directionBias = isMoving && userHeading !== null;

    for (let i = 0; i < numPoints; i++) {
      // Generate random angle, potentially biased toward direction of travel
      let angle;
      if (directionBias && Math.random() > 0.3) {
        // 70% of the time, generate points ahead of the user
        const deviation = (Math.random() - 0.5) * 90; // +/- 45 degrees from heading
        angle = deg2rad((userHeading + deviation) % 360);
      } else {
        // Otherwise, random direction
        angle = Math.random() * 2 * Math.PI;
      }

      // Generate random distance within notification radius (in km)
      // Higher risk factors make points closer to the user
      const maxDistance = notificationRadius * (1 - Math.min(weatherRiskFactor + speedRiskFactor, 0.7));
      const distance = Math.random() * maxDistance;

      // Convert distance and angle to lat/lng offsets
      // 0.009 degrees is approximately 1km in latitude
      const latOffset = Math.cos(angle) * distance * 0.009;
      const lngOffset = Math.sin(angle) * distance * 0.009 / Math.cos(lat * Math.PI / 180);

      // Calculate prediction point location
      const predLat = lat + latOffset;
      const predLng = lng + lngOffset;

      // Calculate risk probability based on weather, time, and speed
      // Base probability between 0.5 and 0.8
      let riskProbability = 0.5 + Math.random() * 0.3;

      // Adjust for weather, time, and speed
// Adjust for weather, time, and speed
riskProbability += weatherRiskFactor * 0.1;
riskProbability += timeRiskFactor * 0.15;
riskProbability += speedRiskFactor * 0.1;

// Cap at 0.95 maximum
riskProbability = Math.min(riskProbability, 0.95);

// Calculate if the hotspot is ahead in the direction of travel
let isAhead = false;
if (userHeading !== null) {
  const predDirection = calculateDirection(lat, lng, predLat, predLng);
  const angleDiff = Math.abs((predDirection - userHeading + 360) % 360);
  isAhead = angleDiff < 60 || angleDiff > 300; // Within a 120-degree cone in front
}

// Determine risk level based on probability
let riskLevel;
if (riskProbability > 0.8) riskLevel = 'very high';
else if (riskProbability > 0.7) riskLevel = 'high';
else if (riskProbability > 0.5) riskLevel = 'medium';
else riskLevel = 'low';

// Create prediction object
syntheticPredictions.push({
  id: `pred-${i}`,
  lat: predLat,
  lng: predLng,
  riskProbability: riskProbability,
  riskLevel: riskLevel,
  distance: distance.toFixed(1),
  isAhead: isAhead,
  factors: {
    time: getCurrentTimePeriod(currentHour),
    weekend: currentDay === 0 || currentDay === 6 ? 'Weekend risk' : 'Weekday risk',
    weather: weatherData ? weatherData.weather[0].main : 'Clear'
  },
  category: 'predicted_accident'
});
}

return syntheticPredictions;
};

// Helper function to determine weather risk factor
const getWeatherRiskFactor = (weatherData) => {
if (!weatherData || !weatherData.weather) return 0.1;

const weatherMain = weatherData.weather[0].main.toLowerCase();
if (weatherMain.includes('rain') || weatherMain.includes('drizzle')) return 0.3;
if (weatherMain.includes('snow')) return 0.5;
if (weatherMain.includes('fog') || weatherMain.includes('mist')) return 0.4;
if (weatherMain.includes('storm')) return 0.6;
if (weatherMain.includes('ice') || weatherMain.includes('sleet')) return 0.7;
return 0.1;
};

// Helper function to determine time-based risk factor
const getTimeRiskFactor = (hour, day) => {
// Rush hour risk factor
const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
const rushHourFactor = isRushHour ? 0.3 : 0.0;

// Night driving risk factor
const isNight = hour < 6 || hour >= 20;
const nightFactor = isNight ? 0.2 : 0.0;

// Weekend risk factor (slightly higher for late night on weekends)
const isWeekend = day === 0 || day === 6;
const weekendLateNight = isWeekend && (hour >= 23 || hour <= 3);
const weekendFactor = weekendLateNight ? 0.3 : (isWeekend ? 0.1 : 0.0);

return Math.max(rushHourFactor, nightFactor, weekendFactor);
};

// Helper function to determine speed-based risk factor
const getSpeedRiskFactor = (speed) => {
const speedNum = parseFloat(speed);
if (isNaN(speedNum)) return 0;

if (speedNum > 100) return 0.5;
if (speedNum > 80) return 0.3;
if (speedNum > 60) return 0.2;
return 0.1;
};

// Helper function to get current time period description
const getCurrentTimePeriod = (hour) => {
if (hour >= 5 && hour < 12) return 'Morning risk';
if (hour >= 12 && hour < 17) return 'Afternoon risk';
if (hour >= 17 && hour < 21) return 'Evening risk';
return 'Night risk';
};

// Function to determine if an alert is critical enough for voice notification
const isAlertCritical = (alert) => {
// Only alerts within 3km that are ahead of user
if (parseFloat(alert.distance) > 3) return false;

// If we're moving, only alert about things ahead of us
if (realMovement && !alert.isAhead) return false;

// Always alert about accidents
if (alert.category === 'accident') return true;

// Alert about severe weather
if (alert.category === 'weather' && alert.severity === 'high') return true;

// Alert about high risk predictions in the path
if (alert.category === 'predicted_accident' && 
  (alert.riskLevel === 'high' || alert.riskLevel === 'very high') &&
  alert.isAhead) return true;

return false;
};

if (isLoading) return <div className="loading">Loading map...</div>;
if (error) return <div className="error">{error}</div>;

return (
<div className="map-container">
{currentPosition && (
  <MapContainer
    center={currentPosition}
    zoom={15}
    style={{ height: '100vh', width: '100%' }}
  >
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    />
    
    {/* Current position marker */}
    <Marker 
      position={currentPosition}
      icon={userDirectionIcon(userHeading || 0)}
    >
      <Popup>
        <div>
          <strong>Your Position</strong>
          <br />
          {showSpeed && (
            <span>Speed: {userSpeed} km/h</span>
          )}
        </div>
      </Popup>
    </Marker>
    
    {/* Notification radius circle */}
    <Circle
      center={currentPosition}
      radius={notificationRadius * 1000}
      pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.05 }}
    />
    
    {/* Alert markers */}
    {alertLocations.map(alert => (
      <Marker
        key={alert.id}
        position={[alert.lat, alert.lng]}
        icon={
          alert.category === 'accident' ? accidentIcon :
          alert.category === 'weather' ? weatherIcon :
          trafficIcon
        }
      >
        <Popup>
          <div>
            <strong>{alert.message}</strong>
            <br />
            Distance: {alert.distance} km
            <br />
            {alert.affectsRoadCondition && (
              <div>
                <strong>Road conditions:</strong> {alert.roadConditionEffect}
              </div>
            )}
          </div>
        </Popup>
      </Marker>
    ))}
    
    {/* Predicted accident hotspots */}
    {predictedHotspots.map(hotspot => (
      <Circle
        key={hotspot.id}
        center={[hotspot.lat, hotspot.lng]}
        radius={100 + (hotspot.riskProbability * 100)}
        pathOptions={{ 
          color: 
            hotspot.riskLevel === 'very high' ? '#FF0000' :
            hotspot.riskLevel === 'high' ? '#FF4500' :
            hotspot.riskLevel === 'medium' ? '#FFA500' :
            '#FFCC00',
          fillColor: 
            hotspot.riskLevel === 'very high' ? '#FF0000' :
            hotspot.riskLevel === 'high' ? '#FF4500' :
            hotspot.riskLevel === 'medium' ? '#FFA500' :
            '#FFCC00',
          fillOpacity: 0.4 * hotspot.riskProbability
        }}
      >
        <Popup>
          <div>
            <strong>Risk Prediction</strong>
            <br />
            Risk Level: <span style={{
              color: 
                hotspot.riskLevel === 'very high' ? '#FF0000' :
                hotspot.riskLevel === 'high' ? '#FF4500' :
                hotspot.riskLevel === 'medium' ? '#FFA500' :
                '#FFCC00'
            }}>{hotspot.riskLevel}</span>
            <br />
            Distance: {hotspot.distance} km
            <br />
            Factors:
            <ul>
              {Object.entries(hotspot.factors).map(([key, value]) => (
                <li key={key}>{value}</li>
              ))}
            </ul>
          </div>
        </Popup>
      </Circle>
    ))}
    
    <MapUpdater position={currentPosition} zoom={15} />
  </MapContainer>
)}

{showSpeed && (
  <div className="speed-indicator">
    {userSpeed} km/h
  </div>
)}
</div>
);
}

export default MapView;