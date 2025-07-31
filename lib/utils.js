const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Rate limiting
const rateLimiter = new Map();

function checkRateLimit(ip, limit = 100, window = 3600000) {
  const now = Date.now();
  const userRequests = rateLimiter.get(ip) || { count: 0, resetTime: now + window };
  
  if (now > userRequests.resetTime) {
    userRequests.count = 1;
    userRequests.resetTime = now + window;
  } else {
    userRequests.count++;
  }
  
  rateLimiter.set(ip, userRequests);
  return userRequests.count <= limit;
}

function handleCors(req, res) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

function createResponse(success, data = null, error = null, statusCode = 200) {
  return {
    success,
    timestamp: new Date().toISOString(),
    data,
    error,
    statusCode
  };
}

function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         '127.0.0.1';
}

module.exports = {
  cache,
  corsHeaders,
  checkRateLimit,
  handleCors,
  createResponse,
  getClientIP
};
