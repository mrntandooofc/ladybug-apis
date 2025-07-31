const axios = require('axios');
const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 100, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { city, units = 'metric' } = req.query;
    
    if (!city) {
      return res.status(400).json(createResponse(false, null, 'City parameter is required', 400));
    }

    // Check cache
    const cacheKey = `weather_${city.toLowerCase()}_${units}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    // Use free weather service
    const weatherData = await getFreeWeatherData(city, units);
    
    // Cache result
    cache.set(cacheKey, weatherData, 600); // 10 minutes

    return res.status(200).json(createResponse(true, weatherData));
  } catch (error) {
    console.error('Weather API Error:', error);
    return res.status(500).json(createResponse(false, null, 'Weather service unavailable', 500));
  }
}

async function getFreeWeatherData(city, units) {
  try {
    // Using OpenWeatherMap free tier (requires API key) or fallback to wttr.in
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (API_KEY) {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${units}`;
      const response = await axios.get(url);
      const data = response.data;
      
      return {
        location: {
          name: data.name,
          country: data.sys.country,
          coordinates: {
            lat: data.coord.lat,
            lon: data.coord.lon
          }
        },
        current: {
          temperature: Math.round(data.main.temp),
          feels_like: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          condition: data.weather[0].main,
          description: data.weather[0].description,
          icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
          wind: {
            speed: data.wind.speed,
            direction: data.wind.deg
          }
        },
        units: units === 'metric' ? '°C' : '°F'
      };
    } else {
      // Fallback to wttr.in (free service)
      const response = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      const data = response.data;
      
      return {
        location: {
          name: city,
          country: data.nearest_area[0].country[0].value,
          coordinates: {
            lat: parseFloat(data.nearest_area[0].latitude),
            lon: parseFloat(data.nearest_area[0].longitude)
          }
        },
        current: {
          temperature: parseInt(data.current_condition[0].temp_C),
          feels_like: parseInt(data.current_condition[0].FeelsLikeC),
          humidity: parseInt(data.current_condition[0].humidity),
          pressure: parseInt(data.current_condition[0].pressure),
          condition: data.current_condition[0].weatherDesc[0].value,
          description: data.current_condition[0].weatherDesc[0].value,
          wind: {
            speed: parseInt(data.current_condition[0].windspeedKmph),
            direction: data.current_condition[0].winddir16Point
          }
        },
        units: '°C'
      };
    }
  } catch (error) {
    throw new Error('Unable to fetch weather data');
  }
}
