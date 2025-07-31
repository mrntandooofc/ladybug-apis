const axios = require('axios');
const cheerio = require('cheerio');
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

    if (!isValidInstagramUrl(url)) {
      return res.status(400).json(createResponse(false, null, 'Invalid Instagram URL', 400));
    }

    // Check cache
    const cacheKey = `instagram_${Buffer.from(url).toString('base64')}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const mediaData = await getInstagramMedia(url);
    
    // Cache results
    cache.set(cacheKey, mediaData, 600); // 10 minutes

    return res.status(200).json(createResponse(true, mediaData));
  } catch (error) {
    console.error('Instagram API Error:', error);
    return res.status(500).json(createResponse(false, null, 'Instagram service unavailable', 500));
  }
}

function isValidInstagramUrl(url) {
  const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/;
  return instagramRegex.test(url);
}

async function getInstagramMedia(url) {
  try {
    // Note: This is a simplified version. In production, you'd need proper Instagram API access
    // For demo purposes, we'll return a structured response
    
    const postId = extractPostId(url);
    
    return {
      url: url,
      postId: postId,
      type: url.includes('/reel/') ? 'reel' : url.includes('/tv/') ? 'igtv' : 'post',
      downloadUrl: `https://ladybug-api.vercel.app/api/instagram/download?id=${postId}`,
      thumbnail: 'https://via.placeholder.com/400x400?text=Instagram+Media',
      caption: 'Instagram media content',
      author: 'Instagram User',
      timestamp: new Date().toISOString(),
      note: 'This is a demo response. Actual Instagram downloading requires proper API access and compliance with Instagram Terms of Service.'
    };
  } catch (error) {
    throw new Error('Unable to process Instagram URL');
  }
}

function extractPostId(url) {
  const match = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : 'unknown';
}
