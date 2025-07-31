const axios = require('axios');
const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 30, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { url, quality = '720p' } = req.query;
    
    if (!url) {
      return res.status(400).json(createResponse(false, null, 'URL parameter is required', 400));
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json(createResponse(false, null, 'Invalid YouTube URL', 400));
    }

    // Check cache
    const cacheKey = `ytmp4_${videoId}_${quality}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const videoData = await getYouTubeVideo(videoId, quality);
    
    // Cache results
    cache.set(cacheKey, videoData, 600); // 10 minutes

    return res.status(200).json(createResponse(true, videoData));
  } catch (error) {
    console.error('YouTube MP4 API Error:', error);
    return res.status(500).json(createResponse(false, null, 'YouTube MP4 service unavailable', 500));
  }
}

function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function getYouTubeVideo(videoId, quality) {
  try {
    // Get video info using YouTube oEmbed API
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await axios.get(oembedUrl);
    const videoInfo = response.data;
    
    // Available quality options
    const qualityOptions = {
      '144p': { itag: 17, resolution: '144p', fps: 30 },
      '240p': { itag: 5, resolution: '240p', fps: 30 },
      '360p': { itag: 18, resolution: '360p', fps: 30 },
      '480p': { itag: 135, resolution: '480p', fps: 30 },
      '720p': { itag: 22, resolution: '720p', fps: 30 },
      '1080p': { itag: 137, resolution: '1080p', fps: 30 }
    };
    
    const selectedQuality = qualityOptions[quality] || qualityOptions['720p'];
    const downloadUrl = `https://ladybug-api.vercel.app/api/ytmp4/download?id=${videoId}&quality=${quality}`;
    
    return {
      videoId: videoId,
      title: videoInfo.title,
      author: videoInfo.author_name,
      thumbnail: videoInfo.thumbnail_url,
      duration: 'Unknown',
      format: 'mp4',
      quality: selectedQuality.resolution,
      fps: selectedQuality.fps,
      fileSize: 'Variable',
      downloadUrl: downloadUrl,
      directUrl: `https://rr3---sn-4g5e6nsr.googlevideo.com/videoplayback?expire=1234567890&ei=example&ip=0.0.0.0&id=example&itag=${selectedQuality.itag}&aitags=example&source=youtube&requiressl=yes&vprv=1&mime=video%2Fmp4&otfp=1&gir=yes&clen=example&dur=example&lmt=example&fvip=3&keepalive=yes&c=WEB&txp=example&sparams=expire%2Cei%2Cip%2Cid%2Caitags%2Csource%2Crequiressl%2Cvprv%2Cmime%2Cotfp%2Cgir%2Cclen%2Cdur%2Clmt&lsparams=mh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Clsig&lsig=example&sig=example`,
      availableQualities: Object.keys(qualityOptions),
      conversionTime: '60-120 seconds',
      note: 'This is a demo response. Actual YouTube downloading requires proper API access and compliance with YouTube Terms of Service.'
    };
  } catch (error) {
    throw new Error('Video not found or unavailable');
  }
}
