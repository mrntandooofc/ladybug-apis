const axios = require('axios');
const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 100, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { coin = 'bitcoin', currency = 'usd' } = req.query;
    
    // Check cache
    const cacheKey = `crypto_${coin.toLowerCase()}_${currency.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const cryptoData = await getCryptoData(coin, currency);
    
    // Cache results
    cache.set(cacheKey, cryptoData, 300); // 5 minutes

    return res.status(200).json(createResponse(true, cryptoData));
  } catch (error) {
    console.error('Crypto API Error:', error);
    return res.status(500).json(createResponse(false, null, 'Crypto service unavailable', 500));
  }
}

async function getCryptoData(coin, currency) {
  try {
    // Use CoinGecko free API
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
    const response = await axios.get(url);
    const data = response.data;
    
    if (!data[coin]) {
      throw new Error('Cryptocurrency not found');
    }
    
    const coinData = data[coin];
    
    return {
      coin: coin,
      currency: currency.toUpperCase(),
      price: coinData[currency],
      market_cap: coinData[`${currency}_market_cap`],
      volume_24h: coinData[`${currency}_24h_vol`],
      change_24h: coinData[`${currency}_24h_change`],
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    throw new Error('Unable to fetch cryptocurrency data');
  }
}
