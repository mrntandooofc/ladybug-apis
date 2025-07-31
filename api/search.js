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
    const { q: query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json(createResponse(false, null, 'Query parameter is required', 400));
    }

    // Check cache
    const cacheKey = `search_${Buffer.from(query.toLowerCase()).toString('base64')}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const searchResults = await performSearch(query, parseInt(limit));
    
    // Cache results
    cache.set(cacheKey, searchResults, 1800); // 30 minutes

    return res.status(200).json(createResponse(true, searchResults));
  } catch (error) {
    console.error('Search API Error:', error);
    return res.status(500).json(createResponse(false, null, 'Search service unavailable', 500));
  }
}

async function performSearch(query, limit) {
  try {
    // Use DuckDuckGo Instant Answer API (free)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await axios.get(searchUrl);
    const data = response.data;
    
    const results = [];
    
    // Add instant answer if available
    if (data.Answer) {
      results.push({
        title: 'Instant Answer',
        snippet: data.Answer,
        url: data.AbstractURL || '#',
        type: 'instant_answer'
      });
    }
    
    // Add abstract if available
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Information',
        snippet: data.Abstract,
        url: data.AbstractURL || '#',
        type: 'abstract'
      });
    }
    
    // Add related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, limit - results.length).forEach(topic => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related Topic',
            snippet: topic.Text,
            url: topic.FirstURL,
            type: 'related_topic'
          });
        }
      });
    }
    
    // If no results, provide a fallback
    if (results.length === 0) {
      results.push({
        title: 'Search Results',
        snippet: `Search results for "${query}". Try refining your search query.`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        type: 'fallback'
      });
    }
    
    return {
      query: query,
      total_results: results.length,
      results: results.slice(0, limit)
    };
  } catch (error) {
    throw new Error('Search service unavailable');
  }
}
