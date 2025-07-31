const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// API Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Ladybug Bot API',
    version: '1.0.0',
    description: 'Free WhatsApp Bot APIs for various services',
    author: 'Blessed Tech',
    endpoints: {
      youtube: {
        url: '/api/youtube',
        description: 'Download YouTube videos and audio',
        parameters: ['url', 'format (mp4/mp3)'],
        example: '/api/youtube?url=https://youtube.com/watch?v=example&format=mp4'
      },
      ytmp3: {
        url: '/api/ytmp3',
        description: 'Download YouTube audio as MP3',
        parameters: ['url', 'quality (128/192/256/320)'],
        example: '/api/ytmp3?url=https://youtube.com/watch?v=example&quality=128'
      },
      ytmp4: {
        url: '/api/ytmp4',
        description: 'Download YouTube video as MP4',
        parameters: ['url', 'quality (144p/240p/360p/480p/720p/1080p)'],
        example: '/api/ytmp4?url=https://youtube.com/watch?v=example&quality=720p'
      },
      ai_chat: {
        url: '/api/ai/chat',
        description: 'AI Chat Assistant',
        method: 'POST',
        parameters: ['message', 'conversation_id'],
        example: 'POST /api/ai/chat with body: {"message": "Hello", "conversation_id": "123"}'
      },
      weather: {
        url: '/api/weather',
        description: 'Get weather information',
        parameters: ['city', 'units (metric/imperial)'],
        example: '/api/weather?city=London&units=metric'
      },
      search: {
        url: '/api/search',
        description: 'Web search functionality',
        parameters: ['q (query)', 'limit'],
        example: '/api/search?q=nodejs&limit=10'
      },
      qr: {
        url: '/api/qr',
        description: 'Generate QR codes',
        parameters: ['text', 'size', 'format', 'color', 'background'],
        example: '/api/qr?text=Hello World&size=200&format=png'
      },
      news: {
        url: '/api/news',
        description: 'Get latest news',
        parameters: ['category', 'limit'],
        example: '/api/news?category=technology&limit=10'
      },
      crypto: {
        url: '/api/crypto',
        description: 'Cryptocurrency prices',
        parameters: ['coin', 'currency'],
        example: '/api/crypto?coin=bitcoin&currency=usd'
      },
      meme: {
        url: '/api/meme',
        description: 'Random memes',
        parameters: ['type (random/programming/wholesome/dank)'],
        example: '/api/meme?type=programming'
      },
      quotes: {
        url: '/api/quotes',
        description: 'Inspirational quotes',
        parameters: ['category', 'author'],
        example: '/api/quotes?category=inspirational'
      },
      instagram: {
        url: '/api/instagram',
        description: 'Instagram media downloader',
        parameters: ['url'],
        example: '/api/instagram?url=https://instagram.com/p/example'
      },
      tiktok: {
        url: '/api/tiktok',
        description: 'TikTok video downloader',
        parameters: ['url'],
        example: '/api/tiktok?url=https://tiktok.com/@user/video/123'
      },
      shorten: {
        url: '/api/shorten',
        description: 'URL shortener',
        parameters: ['url', 'custom'],
        example: '/api/shorten?url=https://example.com&custom=mylink'
      },
      password: {
        url: '/api/password',
        description: 'Password generator',
        parameters: ['length', 'uppercase', 'lowercase', 'numbers', 'symbols', 'count'],
        example: '/api/password?length=12&uppercase=true&symbols=true'
      },
      colors: {
        url: '/api/colors',
        description: 'Color palette generator',
        parameters: ['type', 'count', 'format'],
        example: '/api/colors?type=warm&count=5'
      },
      tts: {
        url: '/api/tts',
        description: 'Text to Speech',
        parameters: ['text', 'lang', 'voice', 'speed'],
        example: '/api/tts?text=Hello World&lang=en&speed=1.0'
      }
    },
    usage: {
      rate_limits: {
        default: '100 requests per hour',
        ai_chat: '20 requests per hour',
        downloads: '30 requests per hour'
      },
      response_format: {
        success: true,
        timestamp: '2024-01-01T00:00:00.000Z',
        data: 'Response data here',
        error: null,
        statusCode: 200
      }
    },
    support: {
      documentation: 'https://ladybug-api.vercel.app/docs',
      github: 'https://github.com/blessed-tech/ladybug-api',
      contact: 'support@blessedtech.com'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    services: {
      youtube: 'operational',
      ai_chat: 'operational',
      weather: 'operational',
      search: 'operational',
      qr: 'operational',
      news: 'operational',
      crypto: 'operational',
      meme: 'operational',
      quotes: 'operational',
      instagram: 'limited',
      tiktok: 'limited',
      tts: 'operational'
    },
    last_updated: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      '/api/youtube', '/api/ytmp3', '/api/ytmp4', '/api/ai/chat',
      '/api/weather', '/api/search', '/api/qr', '/api/news',
      '/api/crypto', '/api/meme', '/api/quotes', '/api/instagram',
      '/api/tiktok', '/api/shorten', '/api/password', '/api/colors', '/api/tts'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Ladybug API Server running on port ${PORT}`);
    console.log(`📖 Documentation: http://localhost:${PORT}`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
