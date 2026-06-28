export enum WeatherCondition {
  CLEAR = "Clear",
  CLOUDY = "Cloudy",
  RAINY = "Rainy",
  STORMY = "Stormy",
  SNOWY = "Snowy",
  HAZY = "Hazy",
  HEATWAVE = "Heatwave"
}

export interface SensorTelemetry {
  barometricPressure: number; // hPa
  anemometerSpeed: number; // km/h
  anemometerDirection: string; // N, NE, E, etc.
  uvIndex: number;
  pm25: number; // ug/m3
  humidity: number; // %
  soilMoisture?: number; // %
  co2?: number; // ppm
}

export interface WeatherData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  feelsLike: number;
  condition: WeatherCondition;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  uvIndex: number;
  aqi: number; // Air Quality Index
  visibility: number; // km
  timestamp: string;
  googleWeatherSynced: boolean;
  satelliteCloudCover: number; // %
  sensors: SensorTelemetry;
}

export interface WeatherAlert {
  id: string;
  title: string;
  city: string;
  state: string;
  severity: "info" | "moderate" | "severe" | "extreme";
  condition: string;
  description: string;
  instructions: string;
  activeSince: string;
  expires: string;
  distance?: number; // km (for nearby checks)
}

export interface HistoricalRecord {
  year: number;
  month: string;
  avgTemp: number;
  rainfall: number; // mm
  humidity: number; // %
  extremeEventsCount: number;
  windSpeed?: number; // km/h
  uvIndex?: number;
}

export interface WeatherNewsItem {
  title: string;
  source: string;
  snippet: string;
  url: string;
  date: string;
  country: string;
}

export interface AIWeatherReport {
  city: string;
  condition: WeatherCondition;
  summary: string;
  riskAssessment: string;
  clothingRecommendation: string;
  atmosphericAnalysis: string;
  satelliteSummary: string;
  citations?: Array<{ title: string; url: string }>;
}
