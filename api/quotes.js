const axios = require('axios');
const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 100, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { category = 'inspirational', author } = req.query;
    
    // Check cache
    const cacheKey = `quote_${category}_${author || 'any'}_${Math.floor(Date.now() / 1800000)}`; // 30-minute cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const quoteData = await getQuoteData(category, author);
    
    // Cache results
    cache.set(cacheKey, quoteData, 1800); // 30 minutes

    return res.status(200).json(createResponse(true, quoteData));
  } catch (error) {
    console.error('Quotes API Error:', error);
    return res.status(500).json(createResponse(false, null, 'Quotes service unavailable', 500));
  }
}

async function getQuoteData(category, author) {
  try {
    // Use quotable.io free API
    let url = 'https://api.quotable.io/random';
    const params = [];
    
    if (category && category !== 'random') {
      const categoryMap = {
        inspirational: 'inspirational',
        motivational: 'motivational',
        success: 'success',
        wisdom: 'wisdom',
        life: 'life',
        love: 'love',
        friendship: 'friendship',
        happiness: 'happiness'
      };
      
      if (categoryMap[category]) {
        params.push(`tags=${categoryMap[category]}`);
      }
    }
    
    if (author) {
      params.push(`author=${encodeURIComponent(author)}`);
    }
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    const response = await axios.get(url);
    const data = response.data;
    
    return {
      quote: data.content,
      author: data.author,
      category: category,
      length: data.length,
      tags: data.tags || []
    };
  } catch (error) {
    // Fallback quotes
    const fallbackQuotes = [
      {
        quote: "The only way to do great work is to love what you do.",
        author: "Steve Jobs",
        category: "inspirational",
        length: 52,
        tags: ["inspirational", "work"]
      },
      {
        quote: "Innovation distinguishes between a leader and a follower.",
        author: "Steve Jobs",
        category: "success",
        length: 58,
        tags: ["success", "leadership"]
      },
      {
        quote: "Life is what happens to you while you're busy making other plans.",
        author: "John Lennon",
        category: "life",
        length: 65,
        tags: ["life", "wisdom"]
      }
    ];
    
    return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
  }
}
