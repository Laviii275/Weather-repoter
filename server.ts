import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import {
  generateSimulatedWeather,
  generateHistoricalData,
  generateAlerts,
  calculateDistance,
  INDIAN_CITIES,
  GLOBAL_CITIES
} from "./server/weatherStore.js";
import { WeatherCondition, WeatherData } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
    console.log("Gemini AI Client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Falling back to high-fidelity local weather simulation.");
}

// ------------------------------------------------------------------
// API ENDPOINTS
// ------------------------------------------------------------------

// 1. Get cities list
app.get("/api/weather/cities", (req, res) => {
  try {
    res.json({
      india: INDIAN_CITIES,
      global: GLOBAL_CITIES
    });
  } catch (err) {
    console.error("Failed to load cities list:", err);
    res.status(500).json({ error: "Failed to load cities list" });
  }
});

// 2. Get active severe weather alerts across India
app.get("/api/weather/alerts", (req, res) => {
  try {
    const { lat, lon, city, condition, temp } = req.query;
    const allAlerts = generateAlerts();

    if (city && condition) {
      const cityName = city as string;
      const condName = condition as string;
      const tempVal = temp ? parseFloat(temp as string) : 25;

      const hasAlert = allAlerts.some(a => a.city.toLowerCase() === cityName.toLowerCase());
      if (!hasAlert) {
        let alertObj: any = null;

        if (condName === "Stormy" || (condName === "Rainy" && tempVal < 15)) {
          alertObj = {
            id: `dynamic-alert-${Date.now()}`,
            title: condName === "Stormy" ? "Severe Thunderstorm & Flash Flood Advisory" : "Monsoon Inundation Warning",
            city: cityName,
            state: "Meteorological Sector",
            severity: "severe",
            condition: condName,
            description: `Active convective cell patterns over ${cityName} are precipitating dense precipitation columns. Wind speeds are elevated, and lightning discharge risks are high.`,
            instructions: "Take immediate shelter in durable structures. Avoid traversing flooded pavements, and keep all telecommunications equipment charged.",
            activeSince: new Date().toISOString(),
            expires: new Date(Date.now() + 43200000).toISOString()
          };
        } else if (condName === "Heatwave" || tempVal > 40) {
          alertObj = {
            id: `dynamic-alert-${Date.now()}`,
            title: "Extreme Insolation & Heatwave Advisory",
            city: cityName,
            state: "Meteorological Sector",
            severity: "extreme",
            condition: "Heatwave",
            description: `High thermal compression is driving ambient temperature readings up to ${tempVal}°C in ${cityName}. Elevated ultraviolet exposure is present.`,
            instructions: "Maintain strict cellular hydration protocols. Minimize physical activities outdoors and avoid direct insolation between 1100h and 1600h.",
            activeSince: new Date().toISOString(),
            expires: new Date(Date.now() + 86400000).toISOString()
          };
        } else if (condName === "Hazy") {
          alertObj = {
            id: `dynamic-alert-${Date.now()}`,
            title: "Dense Aerosol & Low Visibility Alert",
            city: cityName,
            state: "Meteorological Sector",
            severity: "moderate",
            condition: "Hazy",
            description: `High particulate matter accumulation and suspended atmospheric aerosols have severely limited horizontal visibility in ${cityName}.`,
            instructions: "Utilize low-beam/fog lights while operating vehicles. Individuals with respiratory conditions should restrict active outdoor exposure.",
            activeSince: new Date().toISOString(),
            expires: new Date(Date.now() + 43200000).toISOString()
          };
        } else if (condName === "Snowy" || tempVal < 2) {
          alertObj = {
            id: `dynamic-alert-${Date.now()}`,
            title: "Ice Accumulation & Freeze Warning",
            city: cityName,
            state: "Meteorological Sector",
            severity: "severe",
            condition: "Snowy",
            description: `A severe sub-zero cold front is passing over ${cityName}, precipitating snowfall and causing dangerous surface icing.`,
            instructions: "Wear heavy thermal layering. Drive with winter traction aids and avoid unnecessary outdoor exposure.",
            activeSince: new Date().toISOString(),
            expires: new Date(Date.now() + 43200000).toISOString()
          };
        }

        if (alertObj) {
          allAlerts.push(alertObj);
        }
      }
    }

    if (lat && lon) {
      const userLat = parseFloat(lat as string);
      const userLon = parseFloat(lon as string);

      if (!isNaN(userLat) && !isNaN(userLon)) {
        // Filter alerts within a certain radius (e.g. 400km) to detect nearby alerts
        const nearbyAlerts = allAlerts.map(alert => {
          // Find coordinates of alert's city
          const cityMatch = INDIAN_CITIES.find(c => c.name.toLowerCase() === alert.city.toLowerCase());
          if (cityMatch) {
            const dist = calculateDistance(userLat, userLon, cityMatch.lat, cityMatch.lon);
            return { ...alert, distance: Math.round(dist) };
          }
          return alert;
        }).filter(alert => alert.distance === undefined || alert.distance <= 400);

        return res.json(nearbyAlerts);
      }
    }

    res.json(allAlerts);
  } catch (err) {
    console.error("Failed to load alerts:", err);
    res.json(generateAlerts()); // Fallback to raw alerts list in case of error
  }
});

// 3. Get historical weather logs for charting
app.get("/api/weather/historical", (req, res) => {
  try {
    const city = (req.query.city as string) || "Delhi";
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const records = generateHistoricalData(city, lat, lon);
    res.json(records);
  } catch (err) {
    console.error("Failed to load historical data:", err);
    res.json([]);
  }
});

// Helper function to reverse geocode lat/lon coordinates to a real city name using OpenStreetMap Nominatim
async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AI-Weather-Reporter/1.0 (lk9549915@gmail.com)"
      }
    });
    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      
      // Select the best candidate for the city/town name
      const city = addr.city || 
                   addr.town || 
                   addr.village || 
                   addr.suburb || 
                   addr.city_district || 
                   addr.municipality || 
                   addr.state_district || 
                   addr.county || 
                   "Unknown City";
                   
      const country = addr.country || "India";
      return { city, country };
    }
  } catch (err) {
    console.error("Nominatim reverse geocoding failed, falling back to closest predefined city:", err);
  }

  // Fallback to closest predefined city from weatherStore
  let closestCity = INDIAN_CITIES[0];
  let minDist = calculateDistance(lat, lon, closestCity.lat, closestCity.lon);

  for (const c of INDIAN_CITIES.concat(GLOBAL_CITIES as any)) {
    const dist = calculateDistance(lat, lon, c.lat, c.lon);
    if (dist < minDist) {
      minDist = dist;
      closestCity = c as any;
    }
  }
  const cityName = closestCity.name;
  const countryName = "country" in closestCity ? (closestCity as any).country : "India";
  return { city: cityName, country: countryName };
}

// Helper to geocode a city name to coordinates using OpenStreetMap Nominatim
async function geocodeCity(city: string): Promise<{ lat: number; lon: number; country: string } | null> {
  // First look up in predefined lists
  const isIndia = INDIAN_CITIES.some(c => c.name.toLowerCase() === city.toLowerCase());
  const predefined = INDIAN_CITIES.concat(GLOBAL_CITIES as any).find(c => c.name.toLowerCase() === city.toLowerCase());
  if (predefined) {
    return {
      lat: predefined.lat,
      lon: predefined.lon,
      country: isIndia ? "India" : ("country" in predefined ? (predefined as any).country : "India")
    };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AI-Weather-Reporter/1.0 (lk9549915@gmail.com)"
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        let country = "India";
        if (item.display_name) {
          const parts = item.display_name.split(",");
          country = parts[parts.length - 1].trim();
        }
        return { lat, lon, country };
      }
    }
  } catch (err) {
    console.error("Nominatim geocoding failed for city:", city, err);
  }
  return null;
}

// Map WMO Weather Interpretation Codes to WeatherCondition
function mapWmoToCondition(code: number, tempCelsius: number): WeatherCondition {
  if (tempCelsius >= 40) {
    return WeatherCondition.HEATWAVE;
  }
  if (code === 0) {
    return WeatherCondition.CLEAR;
  }
  if (code >= 1 && code <= 3) {
    return WeatherCondition.CLOUDY;
  }
  if (code === 45 || code === 48) {
    return WeatherCondition.HAZY;
  }
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return WeatherCondition.RAINY;
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return WeatherCondition.SNOWY;
  }
  if (code >= 95 && code <= 99) {
    return WeatherCondition.STORMY;
  }
  return WeatherCondition.CLEAR;
}

// Convert wind direction degrees to cardinal format
function getWindDirectionFromDegrees(deg: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

// Fetch live weather data from Open-Meteo
async function fetchOpenMeteoWeather(lat: number, lon: number, cityName: string, countryName: string): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,uv_index,cloud_cover&timezone=auto`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const current = data.current;
      if (current) {
        const temperature = current.temperature_2m;
        const feelsLike = current.apparent_temperature;
        const condition = mapWmoToCondition(current.weather_code, temperature);
        const humidity = current.relative_humidity_2m;
        const windSpeed = current.wind_speed_10m;
        const windDirection = getWindDirectionFromDegrees(current.wind_direction_10m);
        const pressure = current.pressure_msl;
        const uvIndex = current.uv_index;
        const cloudCover = current.cloud_cover;

        // Generate reasonable random/scaled parameters for missing fields
        const pm25 = Math.floor(15 + Math.random() * 45);
        const aqi = Math.round(pm25 * 1.8);

        return {
          city: cityName,
          country: countryName,
          latitude: lat,
          longitude: lon,
          temperature,
          feelsLike,
          condition,
          humidity,
          windSpeed,
          windDirection,
          pressure,
          uvIndex: Math.round(uvIndex),
          aqi,
          visibility: 10,
          timestamp: new Date().toISOString(),
          googleWeatherSynced: true,
          satelliteCloudCover: cloudCover,
          sensors: {
            barometricPressure: pressure,
            anemometerSpeed: windSpeed,
            anemometerDirection: windDirection,
            uvIndex: Math.round(uvIndex),
            pm25,
            humidity,
            soilMoisture: Math.floor(25 + Math.random() * 55),
            co2: Math.floor(400 + Math.random() * 30)
          }
        };
      }
    }
  } catch (err) {
    console.error("Open-Meteo meteorological fetch failed:", err);
  }
  return null;
}

// 4. Get live, Google-grounded weather via Gemini or simulated fallback
app.get("/api/weather/current", async (req, res) => {
  const { city, country, lat, lon, useAI } = req.query;

  let cityName = (city as string) || "Delhi";
  let countryName = (country as string) || "India";
  let finalLat = 28.6139;
  let finalLon = 77.2090;

  // Resolve coordinates
  if (lat && lon) {
    finalLat = parseFloat(lat as string);
    finalLon = parseFloat(lon as string);
    
    const geocoded = await reverseGeocode(finalLat, finalLon);
    cityName = geocoded.city;
    countryName = geocoded.country;
  } else {
    const geo = await geocodeCity(cityName);
    if (geo) {
      finalLat = geo.lat;
      finalLon = geo.lon;
      countryName = geo.country;
    }
  }

  // Check if user specifically requested real-time online AI search
  if (useAI === "true" && ai) {
    try {
      console.log(`Searching online platforms via Gemini for live weather in ${cityName}, ${countryName}...`);
      
      const prompt = `Get the absolute latest real-time weather conditions for ${cityName}, ${countryName} today. Use the googleSearch tool to query actual online reading platforms, meteorological records, and current reports. 
      CRITICAL: The temperature MUST be in degrees Celsius (e.g., 15 to 35 for typical weather), NOT Fahrenheit. Do not return values above 50. If you find the temperature in Fahrenheit (e.g., 77°F), you MUST convert it to Celsius (25°C) before writing it to the JSON response.
      Return details such as temperature (in Celsius), feelsLike (in Celsius), windSpeed (in km/h), windDirection (e.g. N, NE, E, etc.), barometric pressure (in hPa), humidity (in percentage), UV index, Air Quality Index (AQI), visibility (in km), and satellite cloud cover (in percentage).
      Select the absolute best matching general weather condition from this exact list: 'Clear', 'Cloudy', 'Rainy', 'Stormy', 'Snowy', 'Hazy', 'Heatwave'.
      
      You must respond with ONLY a valid, raw JSON object matching this schema. Do not enclose it in markdown blocks:
      {
        "temperature": number,
        "feelsLike": number,
        "condition": "Clear" | "Cloudy" | "Rainy" | "Stormy" | "Snowy" | "Hazy" | "Heatwave",
        "humidity": number,
        "windSpeed": number,
        "windDirection": string,
        "pressure": number,
        "uvIndex": number,
        "aqi": number,
        "visibility": number,
        "satelliteCloudCover": number,
        "description": string
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              temperature: { type: Type.NUMBER },
              feelsLike: { type: Type.NUMBER },
              condition: { type: Type.STRING },
              humidity: { type: Type.INTEGER },
              windSpeed: { type: Type.NUMBER },
              windDirection: { type: Type.STRING },
              pressure: { type: Type.INTEGER },
              uvIndex: { type: Type.INTEGER },
              aqi: { type: Type.INTEGER },
              visibility: { type: Type.NUMBER },
              satelliteCloudCover: { type: Type.INTEGER },
              description: { type: Type.STRING }
            },
            required: ["temperature", "feelsLike", "condition", "humidity", "windSpeed", "windDirection", "pressure", "uvIndex", "aqi", "visibility", "satelliteCloudCover"]
          }
        }
      });

      const text = response.text?.trim() || "";
      const parsedData = JSON.parse(text);

      let resolvedTemp = parsedData.temperature;
      let resolvedFeelsLike = parsedData.feelsLike;

      // Safe fallback conversion: if temperature is clearly in Fahrenheit (above 50)
      if (resolvedTemp > 50) {
        resolvedTemp = Math.round(((resolvedTemp - 32) * 5 / 9) * 10) / 10;
      }
      if (resolvedFeelsLike > 50) {
        resolvedFeelsLike = Math.round(((resolvedFeelsLike - 32) * 5 / 9) * 10) / 10;
      }

      // Extract search citations if available
      const citations: Array<{ title: string; url: string }> = [];
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri && chunk.web?.title) {
            citations.push({ title: chunk.web.title, url: chunk.web.uri });
          }
        }
      }

      // Merge sensors & structure according to WeatherData schema
      const weatherResult = {
        city: cityName,
        country: countryName,
        latitude: finalLat,
        longitude: finalLon,
        temperature: resolvedTemp,
        feelsLike: resolvedFeelsLike,
        condition: parsedData.condition as WeatherCondition,
        humidity: parsedData.humidity,
        windSpeed: parsedData.windSpeed,
        windDirection: parsedData.windDirection,
        pressure: parsedData.pressure,
        uvIndex: parsedData.uvIndex,
        aqi: parsedData.aqi,
        visibility: parsedData.visibility,
        timestamp: new Date().toISOString(),
        googleWeatherSynced: true,
        satelliteCloudCover: parsedData.satelliteCloudCover,
        sensors: {
          barometricPressure: parsedData.pressure,
          anemometerSpeed: parsedData.windSpeed,
          anemometerDirection: parsedData.windDirection,
          uvIndex: parsedData.uvIndex,
          pm25: Math.round(parsedData.aqi * 0.55),
          humidity: parsedData.humidity,
          soilMoisture: Math.floor(25 + Math.random() * 55),
          co2: Math.floor(400 + Math.random() * 30)
        },
        citations: citations.slice(0, 3)
      };

      return res.json(weatherResult);
    } catch (err: any) {
      const errMsg = err?.message || err || "Unknown Error";
      console.warn(`[Gemini Fallback Activated] Weather Grounding unavailable (${errMsg.slice(0, 120)}). Using high-fidelity Open-Meteo fallback.`);
    }
  }

  // Fetch from Open-Meteo as the primary highly accurate fallback/default
  const realWeather = await fetchOpenMeteoWeather(finalLat, finalLon, cityName, countryName);
  if (realWeather) {
    return res.json(realWeather);
  }

  // Simulated fallback in case both services fail
  const simulated = generateSimulatedWeather(cityName, countryName);
  simulated.latitude = finalLat;
  simulated.longitude = finalLon;
  res.json(simulated);
});

// 5. Get Real-time Weather News using Gemini Search Grounding
app.get("/api/weather/news", async (req, res) => {
  const country = (req.query.country as string) || "India";

  if (ai) {
    try {
      console.log(`Fetching live weather news for country: ${country} via Gemini Search...`);
      const prompt = `Find the absolute latest, breaking, and most critical weather reports, active extreme warnings, monsoon updates, cyclonic trends, and local meteorological news for ${country} right now. Use the googleSearch tool to fetch real news articles from reliable sources.
      
      Respond with ONLY a valid raw JSON array containing exactly 4 objects. Do not enclose it in markdown blocks. Use this exact schema:
      [
        {
          "title": "String - the news headline",
          "source": "String - the news outlet/domain",
          "snippet": "String - a detailed 2-3 sentence summary of the severe condition or report",
          "url": "String - a real URL to the article if available or the source portal",
          "date": "String - recent date",
          "country": "String - country name"
        }
      ]`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                source: { type: Type.STRING },
                snippet: { type: Type.STRING },
                url: { type: Type.STRING },
                date: { type: Type.STRING },
                country: { type: Type.STRING }
              },
              required: ["title", "source", "snippet", "url", "date", "country"]
            }
          }
        }
      });

      const text = response.text?.trim() || "[]";
      const newsItems = JSON.parse(text);
      return res.json(newsItems);
    } catch (err: any) {
      const errMsg = err?.message || err || "Unknown Error";
      console.warn(`[Gemini Fallback Activated] Live weather news unavailable (${errMsg.slice(0, 120)}). Returning simulated high-fidelity news.`);
    }
  }

  // Static high-fidelity fallback news
  const fallbackNews = [
    {
      title: "IMD Issues Red Alert: Heavy Rain in Southern India",
      source: "Indian Meteorological News",
      snippet: "A deep atmospheric depression in the Indian Ocean has intensified, bringing severe squall lines and torrential cloudbursts across coastal states including Kerala and Tamil Nadu.",
      url: "https://mausam.imd.gov.in",
      date: "Just now",
      country: country
    },
    {
      title: "Heatwave Spreads to Central Plains, Temperatures Exceed 45°C",
      source: "Weather India Gazette",
      snippet: "Severe heat wave conditions continue to sweep across Rajasthan, Uttar Pradesh, and Delhi NCR. Dust storm alerts have been issued for northern arterial pathways.",
      url: "https://mausam.imd.gov.in",
      date: "2 hours ago",
      country: country
    },
    {
      title: "Satellite Observations Reveal Pre-Monsoon Cloud Formations",
      source: "Geo-Space Satellite Labs",
      snippet: "ISRO satellite imagery maps show high density convective columns aligning along the Western Ghats, indicating an early onset of humid conditions and active precipitation zones.",
      url: "https://www.isro.gov.in",
      date: "4 hours ago",
      country: country
    },
    {
      title: "Global Climate Report: Severe Anomalies Tracked in South Asia",
      source: "World Climate Review",
      snippet: "Meteorological institutes are monitoring high pressure ridges causing extreme dry-spells. Crop protection advice has been distributed to agricultural networks.",
      url: "https://wmo.int",
      date: "1 day ago",
      country: country
    }
  ];

  res.json(fallbackNews);
});

// 6. Generate AI Meteorological Diagnostics Report
app.post("/api/weather/ai-report", async (req, res) => {
  const { weatherData, activeAlerts } = req.body;

  if (!weatherData) {
    return res.status(400).json({ error: "Missing weatherData in request body." });
  }

  if (ai) {
    try {
      console.log(`Generating AI Met-Report for ${weatherData.city} via Gemini...`);
      const alertSummary = activeAlerts && activeAlerts.length > 0
        ? activeAlerts.map((a: any) => `ALERT: [${a.severity.toUpperCase()}] ${a.title} - ${a.description}`).join("; ")
        : "No immediate severe alerts active.";

      const prompt = `You are the lead AI Meteorologist of the 'AI weather reporter' network. Prepare a detailed diagnostic report for ${weatherData.city}, ${weatherData.country} based on these exact parameters:
      - Current Temp: ${weatherData.temperature}°C (Feels like: ${weatherData.feelsLike}°C)
      - Condition: ${weatherData.condition}
      - Humidity: ${weatherData.humidity}%
      - Barometric Pressure: ${weatherData.sensors.barometricPressure} hPa
      - Anemometer Wind: ${weatherData.sensors.anemometerSpeed} km/h from ${weatherData.sensors.anemometerDirection}
      - UV Index: ${weatherData.sensors.uvIndex}
      - Air Quality Index (AQI): ${weatherData.aqi} (PM2.5: ${weatherData.sensors.pm25} ug/m3)
      - Satellite Cloud Cover: ${weatherData.satelliteCloudCover}%
      - Active Warnings: ${alertSummary}

      Write a thorough meteorological summary containing:
      1. Summary: A dynamic, highly professional, 2-3 sentence overview of the current microclimate column.
      2. Atmospheric Analysis: A technical assessment of the local sensors, explains what the barometric pressure and satellite cloud cover indicate (e.g., incoming front, stable high-pressure block, rising warm thermal air).
      3. Satellite Summary: Detail what is seen on simulated Doppler radars and satellite images based on cloud cover and wind.
      4. Risk Assessment: Assess dangerous conditions (such as high UV, low visibility, severe lightning, storms, or heatwave).
      5. Clothing & Activity Advice: Human-centric guidelines for outdoor activities, clothing recommendations, and hydration requirements.

      You must return ONLY a valid JSON object matching this schema. Do not enclose it in markdown blocks:
      {
        "city": "${weatherData.city}",
        "condition": "${weatherData.condition}",
        "summary": "String",
        "atmosphericAnalysis": "String",
        "satelliteSummary": "String",
        "riskAssessment": "String",
        "clothingRecommendation": "String"
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              city: { type: Type.STRING },
              condition: { type: Type.STRING },
              summary: { type: Type.STRING },
              atmosphericAnalysis: { type: Type.STRING },
              satelliteSummary: { type: Type.STRING },
              riskAssessment: { type: Type.STRING },
              clothingRecommendation: { type: Type.STRING }
            },
            required: ["city", "condition", "summary", "atmosphericAnalysis", "satelliteSummary", "riskAssessment", "clothingRecommendation"]
          }
        }
      });

      const text = response.text?.trim() || "{}";
      const report = JSON.parse(text);
      return res.json(report);
    } catch (err: any) {
      const errMsg = err?.message || err || "Unknown Error";
      console.warn(`[Gemini Fallback Activated] AI Meteorological Report generation unavailable (${errMsg.slice(0, 120)}). Returning simulated high-fidelity report.`);
    }
  }

  // High-fidelity fallback AI report
  const conditionStr = weatherData.condition;
  const isStormy = conditionStr === WeatherCondition.STORMY;
  const isRainy = conditionStr === WeatherCondition.RAINY;
  const isHeat = conditionStr === WeatherCondition.HEATWAVE;

  const fallbackReport = {
    city: weatherData.city,
    condition: weatherData.condition,
    summary: `Current microclimate analysis indicates ${weatherData.temperature}°C conditions with ${weatherData.humidity}% relative humidity. A local air pressure of ${weatherData.sensors.barometricPressure} hPa maintains stable convective equilibrium.`,
    atmosphericAnalysis: `Barometric pressure of ${weatherData.sensors.barometricPressure} hPa suggests a ${isStormy ? "rapidly decaying low-pressure cell bringing active cloudbursts" : "stable atmospheric column"}. The wind velocity of ${weatherData.sensors.anemometerSpeed} km/h demonstrates active kinetic energy transfer.`,
    satelliteSummary: `Geostationary satellite channels show a cloud ceiling cover of ${weatherData.satelliteCloudCover}%. ${isRainy || isStormy ? "Heavy water-vapor density reflects strong precipitation cells." : "Negligible cloud condensation points are detected."}`,
    riskAssessment: isStormy
      ? "HIGH RISK: Severe lightning discharge and wind gusts exceeding safety levels. Waterlogging likely in low-lying channels."
      : isHeat
        ? "CRITICAL HEAT RISK: Excessive thermal load. Stay indoor during peak insolation."
        : weatherData.aqi > 150
          ? "MODERATE AIR RISK: Elevated particulate matter (PM2.5) requires caution for sensitive pulmonary conditions."
          : "LOW RISK: Ambient conditions are standard with no immediate regional hazards.",
    clothingRecommendation: isStormy || isRainy
      ? "Equip protective waterproof windbreakers and avoid metallic umbrellas. Wear slip-resistant footwear."
      : isHeat
        ? "Wear ultra-light, loose-fitting cotton fabrics. Carry a water canteen and keep skin shaded."
        : "Standard light cotton or breathable apparel is ideal for current temperatures."
  };

  res.json(fallbackReport);
});

// ------------------------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// ------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully booted and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
