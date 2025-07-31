const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 50, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { url, custom } = req.query;
    
    if (!url) {
      return res.status(400).json(createResponse(false, null, 'URL parameter is required', 400));
    }

    if (!isValidUrl(url)) {
      return res.status(400).json(createResponse(false, null, 'Invalid URL format', 400));
    }

    // Check cache
    const cacheKey = `shorten_${Buffer.from(url).toString('base64')}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const shortData = await createShortUrl(url, custom);
    
    // Cache results
    cache.set(cacheKey, shortData, 86400); // 24 hours

    return res.status(200).json(createResponse(true, shortData));
  } catch (error) {
    console.error('URL Shortener Error:', error);
    return res.status(500).json(createResponse(false, null, 'URL shortening failed', 500));
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

async function createShortUrl(originalUrl, customCode) {
  try {
    // Generate short code
    const shortCode = customCode || generateShortCode();
    const shortUrl = `https://ladybug.short/${shortCode}`;
    
    return {
      originalUrl: originalUrl,
      shortUrl: shortUrl,
      shortCode: shortCode,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      clicks: 0
    };
  } catch (error) {
    throw new Error('Failed to create short URL');
  }
}

function generateShortCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
