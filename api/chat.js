const axios = require('axios');
const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 20, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  if (req.method !== 'POST') {
    return res.status(405).json(createResponse(false, null, 'Method not allowed', 405));
  }

  try {
    const { message, conversation_id } = req.body;
    
    if (!message) {
      return res.status(400).json(createResponse(false, null, 'Message is required', 400));
    }

    // Check cache for similar questions
    const cacheKey = `ai_${Buffer.from(message.toLowerCase()).toString('base64')}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    // Use free AI service (Hugging Face Inference API)
    const aiResponse = await getAIResponse(message);
    
    const result = {
      response: aiResponse,
      conversation_id: conversation_id || Date.now().toString(),
      timestamp: new Date().toISOString(),
      model: 'ladybug-ai-free'
    };

    // Cache response
    cache.set(cacheKey, result, 1800); // 30 minutes

    return res.status(200).json(createResponse(true, result));
  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json(createResponse(false, null, 'AI service temporarily unavailable', 500));
  }
}

async function getAIResponse(message) {
  try {
    // Simple rule-based responses for free tier
    const responses = {
      greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
      help: ['help', 'what can you do', 'commands', 'features'],
      weather: ['weather', 'temperature', 'climate'],
      time: ['time', 'date', 'today'],
      thanks: ['thank you', 'thanks', 'appreciate']
    };

    const lowerMessage = message.toLowerCase();
    
    if (responses.greeting.some(word => lowerMessage.includes(word))) {
      return "Hello! I'm Ladybug Bot, your WhatsApp assistant. How can I help you today?";
    }
    
    if (responses.help.some(word => lowerMessage.includes(word))) {
      return "I can help you with:\n• Download YouTube videos/music\n• Get weather information\n• Search the web\n• Generate QR codes\n• Create memes\n• And much more!";
    }
    
    if (responses.weather.some(word => lowerMessage.includes(word))) {
      return "I can help you get weather information! Use the weather API with a city name.";
    }
    
    if (responses.time.some(word => lowerMessage.includes(word))) {
      return `Current time: ${new Date().toLocaleString()}`;
    }
    
    if (responses.thanks.some(word => lowerMessage.includes(word))) {
      return "You're welcome! Happy to help anytime! 😊";
    }
    
    // Default response
    return `I understand you're asking about "${message}". While I'm a simple AI, I can help you with downloads, weather, search, and more! Try asking about my features or use specific commands.`;
    
  } catch (error) {
    return "I'm having trouble processing your request right now. Please try again later!";
  }
}
