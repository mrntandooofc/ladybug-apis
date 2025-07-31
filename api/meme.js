const axios = require('axios');
const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 50, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { type = 'random' } = req.query;
    
    // Check cache
    const cacheKey = `meme_${type}_${Math.floor(Date.now() / 300000)}`; // 5-minute cache buckets
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const memeData = await getMemeData(type);
    
    // Cache results
    cache.set(cacheKey, memeData, 300); // 5 minutes

    return res.status(200).json(createResponse(true, memeData));
  } catch (error) {
    console.error('Meme API Error:', error);
    return res.status(500).json(createResponse(false, null, 'Meme service unavailable', 500));
  }
}

async function getMemeData(type) {
  try {
    // Use Reddit API for memes
    const subreddits = {
      random: 'memes',
      programming: 'ProgrammerHumor',
      wholesome: 'wholesomememes',
      dank: 'dankmemes',
      funny: 'funny',
      cats: 'catmemes'
    };
    
    const subreddit = subreddits[type] || subreddits.random;
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'LadybugBot/1.0'
      }
    });
    
    const posts = response.data.data.children
      .filter(post => post.data.post_hint === 'image' && !post.data.over_18)
      .map(post => ({
        title: post.data.title,
        url: post.data.url,
        thumbnail: post.data.thumbnail,
        upvotes: post.data.ups,
        comments: post.data.num_comments,
        created: new Date(post.data.created_utc * 1000).toISOString()
      }));
    
    if (posts.length === 0) {
      throw new Error('No memes found');
    }
    
    const randomMeme = posts[Math.floor(Math.random() * posts.length)];
    
    return {
      type: type,
      meme: randomMeme,
      subreddit: subreddit
    };
  } catch (error) {
    // Fallback memes
    const fallbackMemes = [
      {
        title: "When your code works on the first try",
        url: "https://i.imgflip.com/1bij.jpg",
        thumbnail: "https://i.imgflip.com/1bij.jpg",
        upvotes: 1000,
        comments: 50,
        created: new Date().toISOString()
      },
      {
        title: "404 - Humor Not Found",
        url: "https://i.imgflip.com/2/30b1gx.jpg",
        thumbnail: "https://i.imgflip.com/2/30b1gx.jpg",
        upvotes: 800,
        comments: 25,
        created: new Date().toISOString()
      },
      {
        title: "This is fine",
        url: "https://i.imgflip.com/1wz3as.jpg",
        thumbnail: "https://i.imgflip.com/1wz3as.jpg",
        upvotes: 1200,
        comments: 75,
        created: new Date().toISOString()
      }
    ];
    
    const randomFallback = fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)];
    
    return {
      type: type,
      meme: randomFallback,
      subreddit: 'fallback'
    };
  }
}
