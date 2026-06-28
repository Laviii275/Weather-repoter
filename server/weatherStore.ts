import { WeatherCondition, WeatherData, WeatherAlert, HistoricalRecord, SensorTelemetry } from "../src/types.js";

// Helper to calculate distance between two coordinates
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const INDIAN_CITIES = [
  { name: "Delhi", state: "Delhi NCR", lat: 28.6139, lon: 77.2090, defaultTemp: 32 },
  { name: "Mumbai", state: "Maharashtra", lat: 19.0760, lon: 72.8777, defaultTemp: 30 },
  { name: "Kolkata", state: "West Bengal", lat: 22.5726, lon: 88.3639, defaultTemp: 29 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707, defaultTemp: 31 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lon: 77.5946, defaultTemp: 24 },
  { name: "Hyderabad", state: "Telangana", lat: 17.3850, lon: 78.4867, defaultTemp: 28 },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lon: 72.5714, defaultTemp: 33 },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lon: 73.8567, defaultTemp: 26 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lon: 75.7873, defaultTemp: 32 },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lon: 80.9462, defaultTemp: 30 },
  { name: "Guwahati", state: "Assam", lat: 26.1445, lon: 91.7362, defaultTemp: 25 },
  { name: "Srinagar", state: "Jammu & Kashmir", lat: 34.0837, lon: 74.7973, defaultTemp: 15 },
  { name: "Kochi", state: "Kerala", lat: 9.9312, lon: 76.2673, defaultTemp: 29 },
  { name: "Shimla", state: "Himachal Pradesh", lat: 31.1048, lon: 77.1734, defaultTemp: 12 },
  { name: "Patna", state: "Bihar", lat: 25.5941, lon: 85.1376, defaultTemp: 28 },
  { name: "Dehradun", state: "Uttarakhand", lat: 30.3165, lon: 78.0322, defaultTemp: 22 },
  { name: "Bhubaneswar", state: "Odisha", lat: 20.3040, lon: 85.8189, defaultTemp: 30 },
  { name: "Ranchi", state: "Jharkhand", lat: 23.3441, lon: 85.3096, defaultTemp: 25 },
  { name: "Raipur", state: "Chhattisgarh", lat: 21.2514, lon: 81.6296, defaultTemp: 31 },
  { name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lon: 77.4126, defaultTemp: 28 },
  { name: "Chandigarh", state: "Punjab & Haryana", lat: 30.7333, lon: 76.7794, defaultTemp: 27 }
];

export const GLOBAL_CITIES = [
  { name: "New York", country: "United States", lat: 40.7128, lon: -74.0060, defaultTemp: 20 },
  { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, defaultTemp: 14 },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, defaultTemp: 18 },
  { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, defaultTemp: 21 },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522, defaultTemp: 16 },
  { name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357, defaultTemp: 27 },
  { name: "Moscow", country: "Russia", lat: 55.7558, lon: 37.6173, defaultTemp: 6 },
  { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lon: -43.1729, defaultTemp: 25 },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lon: 18.4241, defaultTemp: 19 }
];

// Generates high-fidelity simulated weather for static queries or fallbacks
export function generateSimulatedWeather(cityName: string, countryName: string = "India"): WeatherData {
  const isIndia = countryName.toLowerCase() === "india";
  const baseCities = isIndia ? INDIAN_CITIES : GLOBAL_CITIES;
  const match = baseCities.find(c => c.name.toLowerCase() === cityName.toLowerCase());

  const lat = match ? match.lat : (10 + Math.random() * 25);
  const lon = match ? (isIndia ? match.lon : (Math.random() * 360 - 180)) : (70 + Math.random() * 20);
  const baseTemp = match ? (match as any).defaultTemp : 25;

  // Add random variance based on current hour
  const hour = new Date().getHours();
  const diurnalCycle = Math.sin(((hour - 6) / 24) * 2 * Math.PI) * 4;
  const tempVariance = (Math.random() * 2 - 1) * 2;
  const temperature = Math.round((baseTemp + diurnalCycle + tempVariance) * 10) / 10;
  const feelsLike = Math.round((temperature + (Math.random() * 2 - 1)) * 10) / 10;

  // Select condition
  const conditions = [
    WeatherCondition.CLEAR, WeatherCondition.CLEAR, WeatherCondition.CLOUDY,
    WeatherCondition.RAINY, WeatherCondition.STORMY, WeatherCondition.HAZY
  ];
  const conditionSeed = Math.abs(Math.sin(lat + lon + hour)) * conditions.length;
  let condition = conditions[Math.floor(conditionSeed)];

  // Srinagar / Shimla get snowy in simulated colder temps
  if (temperature < 5) {
    condition = WeatherCondition.SNOWY;
  } else if (temperature > 40 && isIndia) {
    condition = WeatherCondition.HEATWAVE;
  }

  const humidity = condition === WeatherCondition.RAINY || condition === WeatherCondition.STORMY
    ? Math.floor(80 + Math.random() * 15)
    : Math.floor(45 + Math.random() * 35);

  const windSpeed = condition === WeatherCondition.STORMY
    ? Math.floor(35 + Math.random() * 45)
    : Math.floor(5 + Math.random() * 20);

  const windDirections = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const windDirection = windDirections[Math.floor(Math.random() * windDirections.length)];

  const pressure = condition === WeatherCondition.STORMY
    ? Math.floor(985 + Math.random() * 10)
    : Math.floor(1008 + Math.random() * 10);

  const uvIndex = condition === WeatherCondition.CLEAR
    ? Math.floor(8 + Math.random() * 4)
    : Math.floor(1 + Math.random() * 4);

  const aqi = isIndia && ["delhi", "ahmedabad", "jaipur", "patna"].includes(cityName.toLowerCase())
    ? Math.floor(180 + Math.random() * 220)
    : Math.floor(30 + Math.random() * 100);

  const visibility = condition === WeatherCondition.HAZY
    ? Math.round((1 + Math.random() * 3) * 10) / 10
    : Math.round((6 + Math.random() * 4) * 10) / 10;

  const satelliteCloudCover = condition === WeatherCondition.CLEAR
    ? Math.floor(Math.random() * 15)
    : condition === WeatherCondition.CLOUDY
      ? Math.floor(65 + Math.random() * 30)
      : Math.floor(85 + Math.random() * 15);

  const sensors: SensorTelemetry = {
    barometricPressure: pressure,
    anemometerSpeed: windSpeed,
    anemometerDirection: windDirection,
    uvIndex,
    pm25: Math.round(aqi * 0.55),
    humidity,
    soilMoisture: Math.floor(20 + Math.random() * 60),
    co2: Math.floor(390 + Math.random() * 40)
  };

  return {
    city: match ? match.name : cityName,
    country: isIndia ? "India" : (match && "country" in match ? match.country : countryName),
    latitude: lat,
    longitude: lon,
    temperature,
    feelsLike,
    condition,
    humidity,
    windSpeed,
    windDirection,
    pressure,
    uvIndex,
    aqi,
    visibility,
    timestamp: new Date().toISOString(),
    googleWeatherSynced: true,
    satelliteCloudCover,
    sensors
  };
}

// Generates simulated historical data for chart visualizations based on location coordinates
export function generateHistoricalData(cityName: string, lat?: number, lon?: number): HistoricalRecord[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const match = INDIAN_CITIES.concat(GLOBAL_CITIES as any).find(c => c.name.toLowerCase() === cityName.toLowerCase());

  // Resolve coordinates
  const actualLat = lat !== undefined ? lat : (match ? match.lat : 20);
  const actualLon = lon !== undefined ? lon : (match ? match.lon : 77);

  // Compute base temperature from latitude (Equator ~28C, poles freezing)
  const absLat = Math.abs(actualLat);
  let baseTemp = 28 - (absLat * 0.45);
  if (match) {
    baseTemp = (match as any).defaultTemp;
  }

  // Seasonal range amplitude (larger temperature swing at higher latitudes)
  const tempAmplitude = 1.5 + (absLat * 0.25);
  const isSouthernHemisphere = actualLat < 0;

  return months.map((month, idx) => {
    // Standard seasonal curve (inverted seasons in Southern Hemisphere)
    const seasonFactor = Math.sin(((idx - (isSouthernHemisphere ? 0 : 6)) / 12) * 2 * Math.PI + Math.PI / 2);
    const avgTemp = Math.round((baseTemp + seasonFactor * tempAmplitude + (Math.random() * 1.5 - 0.75)) * 10) / 10;

    // Seasonal rainfall pattern
    let rainfall = Math.floor(15 + Math.random() * 30);
    const isIndiaSubcontinent = actualLat > 5 && actualLat < 35 && actualLon > 65 && actualLon < 98;

    if (isIndiaSubcontinent) {
      // Monsoon in India (June-September)
      if (idx >= 5 && idx <= 8) {
        rainfall = Math.floor(180 + Math.random() * 260);
      } else if (idx >= 10 || idx <= 1) {
        rainfall = Math.floor(5 + Math.random() * 15);
      }
    } else if (absLat < 15) {
      // Wet-dry tropical season
      const isWetSeason = isSouthernHemisphere ? (idx >= 10 || idx <= 2) : (idx >= 4 && idx <= 8);
      if (isWetSeason) {
        rainfall = Math.floor(150 + Math.random() * 180);
      }
    } else if (absLat > 40) {
      // Temperate maritime/continental
      const isWinter = isSouthernHemisphere ? (idx >= 5 && idx <= 8) : (idx >= 10 || idx <= 1);
      if (isWinter) {
        rainfall = Math.floor(65 + Math.random() * 70);
      } else {
        rainfall = Math.floor(35 + Math.random() * 40);
      }
    }

    // Humidity matching rainfall and temperature
    let humidity = 50;
    if (rainfall > 150) {
      humidity = Math.floor(75 + Math.random() * 15);
    } else if (rainfall > 50) {
      humidity = Math.floor(60 + Math.random() * 15);
    } else {
      const isDryHot = absLat > 15 && absLat < 35 && (isSouthernHemisphere ? (idx >= 9 || idx <= 2) : (idx >= 3 && idx <= 5));
      if (isDryHot) {
        humidity = Math.floor(20 + Math.random() * 15);
      } else {
        humidity = Math.floor(45 + Math.random() * 20);
      }
    }

    // Count climate extreme events
    let extremeEventsCount = 0;
    if (rainfall > 300) {
      extremeEventsCount = Math.floor(1 + Math.random() * 3);
    } else if (avgTemp > 41) {
      extremeEventsCount = Math.floor(1 + Math.random() * 2);
    } else if (avgTemp < -2 && rainfall > 30) {
      extremeEventsCount = 1;
    } else if (Math.random() > 0.93) {
      extremeEventsCount = 1;
    }

    // Seasonal wind speed pattern (higher in spring/monsoon, lower in winter)
    const windSpeed = Math.round((8 + Math.abs(seasonFactor) * 8 + Math.random() * 6) * 10) / 10;
    
    // Seasonal UV Index pattern (highest in summer, lowest in winter, overall higher closer to equator)
    const maxUVForLat = Math.max(1, 12 - (absLat * 0.25));
    const uvIndex = Math.round(Math.max(1, maxUVForLat * (0.3 + (seasonFactor + 1) * 0.35) + Math.random() * 1.5));

    return {
      year: 2025,
      month,
      avgTemp,
      rainfall,
      humidity,
      extremeEventsCount,
      windSpeed,
      uvIndex
    };
  });
}

// Pre-defined real-time alerts across India
export function generateAlerts(): WeatherAlert[] {
  return [
    {
      id: "alert-1",
      title: "Severe Heatwave Warning (Loo)",
      city: "Delhi",
      state: "Delhi NCR",
      severity: "extreme",
      condition: "Heatwave",
      description: "Severe heatwave conditions persisting with maximum ambient temperatures reaching 45.8°C. Strong, dry, and dusty westerly winds (Loo) blowing during the day.",
      instructions: "Avoid going outdoors between 11:00 AM and 4:00 PM. Drink plenty of water and wear light cotton clothing.",
      activeSince: new Date().toISOString(),
      expires: new Date(Date.now() + 86400000 * 2).toISOString()
    },
    {
      id: "alert-2",
      title: "Extremely Heavy Rainfall Outlook",
      city: "Kolkata",
      state: "West Bengal",
      severity: "severe",
      condition: "Stormy",
      description: "Low-pressure system over Bay of Bengal triggering torrential rain spells and severe squally winds exceeding 65 km/h. High tide water inundation expected.",
      instructions: "Avoid coastal water bodies, secure loose outdoor objects, and stay indoors due to urban waterlogging risk.",
      activeSince: new Date().toISOString(),
      expires: new Date(Date.now() + 86400000).toISOString()
    },
    {
      id: "alert-3",
      title: "Dense Fog & Poor Visibility Alert",
      city: "Srinagar",
      state: "Jammu & Kashmir",
      severity: "moderate",
      condition: "Hazy",
      description: "Dense fog layer reducing horizontal visibility to less than 150 meters, impacting Srinagar highway and airport runways.",
      instructions: "Use fog lights, drive below speed limits, and expect flight schedule delays.",
      activeSince: new Date().toISOString(),
      expires: new Date(Date.now() + 43200000).toISOString()
    },
    {
      id: "alert-4",
      title: "Sudden Flash Flood Advisory",
      city: "Shimla",
      state: "Himachal Pradesh",
      severity: "extreme",
      condition: "Rainy",
      description: "Cloudburst upstream triggered severe torrents, causing rapid surge in river discharge and riverbank erosion.",
      instructions: "Evacuate low-lying river areas immediately. Refrain from driving across submerged bridges.",
      activeSince: new Date().toISOString(),
      expires: new Date(Date.now() + 21600000).toISOString()
    },
    {
      id: "alert-5",
      title: "Squall & Light Storm Warning",
      city: "Bengaluru",
      state: "Karnataka",
      severity: "moderate",
      condition: "Stormy",
      description: "Thunderstorms with light wind gusts and rain showers passing through southeast parts of Bengaluru city.",
      instructions: "Do not take shelter under solitary trees or near high-tension electrical structures.",
      activeSince: new Date().toISOString(),
      expires: new Date(Date.now() + 10800000).toISOString()
    },
    {
      id: "alert-6",
      title: "High UV Radiation Advisory",
      city: "Ahmedabad",
      state: "Gujarat",
      severity: "moderate",
      condition: "Clear",
      description: "Extreme ultraviolet index level of 11.5 detected around midday hours. Clear, unclouded skies.",
      instructions: "Apply SPF 30+ sunscreen, wear protective sunglasses, and use sun umbrellas.",
      activeSince: new Date().toISOString(),
      expires: new Date(Date.now() + 14400000).toISOString()
    },
    {
      id: "alert-7",
      title: "Severe Lightning Strike Outlook",
      city: "Guwahati",
      state: "Assam",
      severity: "severe",
      condition: "Stormy",
      description: "Rapid convective cloud development triggering heavy cloud-to-ground lightning discharge clusters.",
      instructions: "Avoid carrying metal equipment, move inside concrete structures immediately.",
      activeSince: new Date().toISOString(),
      expires: new Date(Date.now() + 18000000).toISOString()
    }
  ];
}
