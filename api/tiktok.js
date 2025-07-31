const axios = require('axios');
const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 30, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json(createResponse(false, null, 'URL parameter is required', 400));
    }

    if (!isValidTikTokUrl(url)) {
      return res.status(400).json(createResponse(false, null, 'Invalid TikTok URL', 400));
    }

    // Check cache
    const cacheKey = `tiktok_${Buffer.from(url).toString('base64')}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const videoData = await getTikTokVideo(url);
    
    // Cache results
    cache.set(cacheKey, videoData, 600); // 10 minutes

    return res.status(200).json(createResponse(true, videoData));
  } catch (error) {
    console.error('TikTok API Error:', error);
    return res.status(500).json(createResponse(false, null, 'TikTok service unavailable', 500));
  }
}

function isValidTikTokUrl(url) {
  const tiktokRegex = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)/;
  return tiktokRegex.test(url);
}

async function getTikTokVideo(url) {
  try {
    // Note: This is a simplified version for demo purposes
    const videoId = extractTikTokId(url);
    
    return {
      url: url,
      videoId: videoId,
      title: 'TikTok Video',
      downloadUrl: `https://ladybug-api.vercel.app/api/tiktok/download?id=${videoId}`,
      thumbnail: 'https://via.placeholder.com/400x600?text=TikTok+Video',
      duration: 'Unknown',
      author: 'TikTok User',
      likes: 'N/A',
      comments: 'N/A',
      shares: 'N/A',
      timestamp: new Date().toISOString(),
      note: 'This is a demo response. Actual TikTok downloading requires proper API access and compliance with TikTok Terms of Service.'
    };
  } catch (error) {
    throw new Error('Unable to process TikTok URL');
  }
}

function extractTikTokId(url) {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : Date.now().toString();
}
