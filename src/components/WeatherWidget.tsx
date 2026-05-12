import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, WeatherData } from '../store/appStore';

const weatherIcons: Record<string, string> = {
  '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
  '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

type Coordinates = {
  lat: number;
  lon: number;
  label?: string;
};

type HttpJsonResponse = {
  ok: boolean;
  status: number;
  data: any;
};

function readResponseMessage(response: HttpJsonResponse, fallback: string) {
  const message = response.data?.message ? String(response.data.message) : fallback;
  const code = response.data?.cod ? String(response.data.cod) : String(response.status || 'network');
  return `OpenWeather ${code}: ${message}`;
}

async function httpGetJson(url: string) {
  if (window.electronAPI?.httpGet) {
    const response = await window.electronAPI.httpGet(url);
    let data: any = null;
    try {
      data = response.body ? JSON.parse(response.body) : null;
    } catch {
      data = null;
    }

    return { ok: response.ok, status: response.status, data };
  }

  const response = await fetch(url);
  const body = await response.text();
  let data: any = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = null;
  }

  return { ok: response.ok, status: response.status, data };
}

function formatGeoLabel(place: any, fallback: string) {
  const parts = [place.name, place.state, place.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : fallback;
}

function getLocationQueries(location: string) {
  const query = location.trim().replace(/\s+/g, ' ');
  const queries = [query];
  const ukMatch = query.match(/^(.+?)\s+(uk|gb)$/i);
  const commaUkMatch = query.match(/^(.+?),\s*(uk|gb)$/i);

  if (ukMatch) {
    queries.push(`${ukMatch[1]},GB`);
    queries.push(`${ukMatch[1]},UK`);
  }

  if (commaUkMatch) {
    queries.push(`${commaUkMatch[1]},GB`);
    queries.push(`${commaUkMatch[1]},UK`);
  }

  return [...new Set(queries)];
}

function getDeviceCoordinates() {
  return new Promise<Coordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Device location is not available'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      }),
      () => reject(new Error('Location permission denied')),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30 * 60 * 1000 }
    );
  });
}

async function getIpCoordinates(): Promise<Coordinates> {
  const providers = [
    async () => {
      const { ok, data } = await httpGetJson('https://ipwho.is/');
      if (!ok || !data?.success || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null;
      return {
        lat: data.latitude,
        lon: data.longitude,
        label: [data.city, data.region, data.country].filter(Boolean).join(', ') || 'Current location',
      };
    },
    async () => {
      const { ok, data } = await httpGetJson('https://ipapi.co/json/');
      if (!ok || typeof data?.latitude !== 'number' || typeof data?.longitude !== 'number') return null;
      return {
        lat: data.latitude,
        lon: data.longitude,
        label: [data.city, data.region, data.country_name].filter(Boolean).join(', ') || 'Current location',
      };
    },
    async () => {
      const { ok, data } = await httpGetJson('https://ipinfo.io/json');
      const [lat, lon] = typeof data?.loc === 'string' ? data.loc.split(',').map(Number) : [];
      if (!ok || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        lat,
        lon,
        label: [data.city, data.region, data.country].filter(Boolean).join(', ') || 'Current location',
      };
    },
  ];

  for (const provider of providers) {
    try {
      const coordinates = await provider();
      if (coordinates) return coordinates;
    } catch {
      // Try the next provider.
    }
  }

  throw new Error('Unable to detect location');
}

async function getLocationCoordinates(location: string, apiKey: string): Promise<Coordinates> {
  const query = location.trim();
  if (!query) throw new Error('Add a location or enable device location');

  for (const candidate of getLocationQueries(query)) {
    const response = await httpGetJson(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(candidate)}&limit=1&appid=${encodeURIComponent(apiKey)}`
    );

    if (response.status === 401) throw new Error(readResponseMessage(response, 'Invalid API key'));
    if (!response.ok) continue;

    const results = response.data;
    if (Array.isArray(results) && results.length > 0) {
      return {
        lat: results[0].lat,
        lon: results[0].lon,
        label: formatGeoLabel(results[0], query),
      };
    }
  }

  throw new Error(`Location not found: ${query}`);
}

async function getReverseLocationLabel(coordinates: Coordinates, apiKey: string) {
  if (coordinates.label) return coordinates.label;

  const reverse = await httpGetJson(
    `https://api.openweathermap.org/geo/1.0/reverse?lat=${coordinates.lat}&lon=${coordinates.lon}&limit=1&appid=${encodeURIComponent(apiKey)}`
  );
  if (!reverse.ok) return 'Current location';

  const results = reverse.data;
  if (!Array.isArray(results) || results.length === 0) return 'Current location';

  return formatGeoLabel(results[0], 'Current location');
}

function weatherFromApiData(data: any, locationLabel?: string): WeatherData {
  return {
    temp: Math.round(data.main.temp),
    condition: data.weather[0].main,
    icon: data.weather[0].icon,
    humidity: data.main.humidity,
    wind: Math.round(data.wind.speed),
    location: locationLabel || data.name || 'Current location',
    lastUpdated: Date.now(),
  };
}

async function fetchWeatherByLocation(location: string, apiKey: string, unit: 'metric' | 'imperial'): Promise<WeatherData> {
  const query = location.trim();
  let lastError = `Location not found: ${query}`;

  for (const candidate of getLocationQueries(query)) {
    const response = await httpGetJson(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(candidate)}&appid=${encodeURIComponent(apiKey)}&units=${unit}`
    );

    if (response.status === 401) throw new Error(readResponseMessage(response, 'Invalid API key'));
    if (!response.ok) {
      lastError = readResponseMessage(response, lastError);
      continue;
    }

    return weatherFromApiData(response.data);
  }

  throw new Error(lastError);
}

async function fetchWeatherByCoordinates(coordinates: Coordinates, apiKey: string, unit: 'metric' | 'imperial'): Promise<WeatherData> {
  const response = await httpGetJson(
    `https://api.openweathermap.org/data/2.5/weather?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${encodeURIComponent(apiKey)}&units=${unit}`
  );

  if (response.status === 401) throw new Error(readResponseMessage(response, 'Invalid API key'));
  if (!response.ok) throw new Error(readResponseMessage(response, 'Unable to load weather'));

  const data = response.data;
  const label = await getReverseLocationLabel(coordinates, apiKey);
  return weatherFromApiData(data, label);
}

export function WeatherWidget() {
  const {
    weather,
    weatherApiKey,
    weatherLocation,
    weatherUnit,
    weatherUseCurrentLocation,
    setWeather,
  } = useAppStore();
  const apiKey = weatherApiKey.trim();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadWeather = async () => {
      if (!apiKey) {
        setError('Add OpenWeather API key');
        return;
      }

      if (!weatherUseCurrentLocation && !weatherLocation.trim()) {
        setError('Add location or enable device location');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const nextWeather = weatherUseCurrentLocation
          ? await fetchWeatherByCoordinates(await getDeviceCoordinates().catch(getIpCoordinates), apiKey, weatherUnit)
          : await fetchWeatherByLocation(weatherLocation, apiKey, weatherUnit).catch(async () => {
              const coordinates = await getLocationCoordinates(weatherLocation, apiKey);
              return fetchWeatherByCoordinates(coordinates, apiKey, weatherUnit);
            });

        if (!cancelled) setWeather(nextWeather);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load weather');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, [apiKey, weatherLocation, weatherUnit, weatherUseCurrentLocation]);

  const icon = weather?.icon ? weatherIcons[weather.icon] : '🌡️';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel weather-panel">
      <div className="min-w-0">
        {weather && !error ? (
          <>
            <div className="weather-temp">{weather.temp}°</div>
            <div className="weather-meta">{weather.condition}</div>
            <div className="weather-meta">{weather.location}</div>
            <div className="weather-meta">Humidity {weather.humidity}%</div>
          </>
        ) : (
          <div className="weather-meta">{loading ? 'Loading weather...' : error || 'Configure in settings'}</div>
        )}
      </div>
      <div className="weather-icon">{icon}</div>
    </motion.div>
  );
}
