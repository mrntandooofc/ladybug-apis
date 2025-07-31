const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 20, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { text, lang = 'en', voice = 'female', speed = 1.0 } = req.query;
    
    if (!text) {
      return res.status(400).json(createResponse(false, null, 'Text parameter is required', 400));
    }

    if (text.length > 500) {
      return res.status(400).json(createResponse(false, null, 'Text too long (max 500 characters)', 400));
    }

    // Check cache
    const cacheKey = `tts_${Buffer.from(text).toString('base64')}_${lang}_${voice}_${speed}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const ttsData = await generateTTS(text, lang, voice, parseFloat(speed));
    
    // Cache results
    cache.set(cacheKey, ttsData, 3600); // 1 hour

    return res.status(200).json(createResponse(true, ttsData));
  } catch (error) {
    console.error('TTS API Error:', error);
    return res.status(500).json(createResponse(false, null, 'TTS service unavailable', 500));
  }
}

async function generateTTS(text, lang, voice, speed) {
  try {
    // Using Google Translate TTS (free service)
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob&ttsspeed=${speed}`;
    
    const supportedLanguages = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi'
    };

    return {
      text: text,
      language: lang,
      languageName: supportedLanguages[lang] || 'Unknown',
      voice: voice,
      speed: speed,
      audioUrl: audioUrl,
      duration: Math.ceil(text.length / 10), // Approximate duration in seconds
      characterCount: text.length,
      wordCount: text.split(' ').length,
      downloadUrl: `https://ladybug-api.vercel.app/api/tts/download?text=${encodeURIComponent(text)}&lang=${lang}&speed=${speed}`,
      note: 'Audio URL is generated using Google Translate TTS service'
    };
  } catch (error) {
    throw new Error('Unable to generate TTS audio');
  }
}
