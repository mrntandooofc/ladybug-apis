const axios = require('axios');
const cheerio = require('cheerio');
const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 50, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { url, format = 'mp4' } = req.query;
    
    if (!url) {
      return res.status(400).json(createResponse(false, null, 'URL parameter is required', 400));
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json(createResponse(false, null, 'Invalid YouTube URL', 400));
    }

    // Check cache
    const cacheKey = `youtube_${videoId}_${format}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    // Get video info using free method
    const videoInfo = await getVideoInfo(videoId);
    
    const result = {
      title: videoInfo.title,
      duration: videoInfo.duration,
      thumbnail: videoInfo.thumbnail,
      downloadUrl: `https://ladybug-api.vercel.app/api/youtube/download?id=${videoId}&format=${format}`,
      format: format,
      quality: format === 'mp3' ? '128kbps' : '720p',
      size: 'Variable',
      videoId: videoId
    };

    // Cache result
    cache.set(cacheKey, result, 300); // 5 minutes

    return res.status(200).json(createResponse(true, result));
  } catch (error) {
    console.error('YouTube API Error:', error);
    return res.status(500).json(createResponse(false, null, 'Failed to process YouTube URL', 500));
  }
}

function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function getVideoInfo(videoId) {
  try {
    // Use YouTube oEmbed API (free)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await axios.get(oembedUrl);
    
    return {
      title: response.data.title,
      duration: 'Unknown',
      thumbnail: response.data.thumbnail_url,
      author: response.data.author_name
    };
  } catch (error) {
    throw new Error('Video not found or private');
  }
}
