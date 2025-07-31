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
    const { category = 'general', limit = 10 } = req.query;
    
    // Check cache
    const cacheKey = `news_${category}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const newsData = await getNewsData(category, parseInt(limit));
    
    // Cache results
    cache.set(cacheKey, newsData, 900); // 15 minutes

    return res.status(200).json(createResponse(true, newsData));
  } catch (error) {
    console.error('News API Error:', error);
    return res.status(500).json(createResponse(false, null, 'News service unavailable', 500));
  }
}

async function getNewsData(category, limit) {
  try {
    // Use RSS feeds for free news (BBC, Reuters, etc.)
    const rssFeeds = {
      general: 'https://feeds.bbci.co.uk/news/rss.xml',
      technology: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
      business: 'https://feeds.bbci.co.uk/news/business/rss.xml',
      sports: 'https://feeds.bbci.co.uk/sport/rss.xml',
      health: 'https://feeds.bbci.co.uk/news/health/rss.xml'
    };

    const feedUrl = rssFeeds[category] || rssFeeds.general;
    const response = await axios.get(feedUrl);
    const $ = cheerio.load(response.data, { xmlMode: true });
    
    const articles = [];
    $('item').slice(0, limit).each((i, item) => {
      const $item = $(item);
      articles.push({
        title: $item.find('title').text(),
        description: $item.find('description').text().replace(/<[^>]*>/g, ''),
        url: $item.find('link').text(),
        publishedAt: new Date($item.find('pubDate').text()).toISOString(),
        source: 'BBC News'
      });
    });

    return {
      category: category,
      total_results: articles.length,
      articles: articles
    };
  } catch (error) {
    throw new Error('Unable to fetch news data');
  }
}
