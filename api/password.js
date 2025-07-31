const { handleCors, createResponse, checkRateLimit, getClientIP } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 100, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { 
      length = 12, 
      uppercase = true, 
      lowercase = true, 
      numbers = true, 
      symbols = false,
      count = 1
    } = req.query;

    const passwordLength = Math.min(Math.max(parseInt(length), 4), 128);
    const passwordCount = Math.min(Math.max(parseInt(count), 1), 10);

    const passwords = [];
    for (let i = 0; i < passwordCount; i++) {
      passwords.push(generatePassword(passwordLength, {
        uppercase: uppercase === 'true',
        lowercase: lowercase === 'true',
        numbers: numbers === 'true',
        symbols: symbols === 'true'
      }));
    }

    const result = {
      passwords: passwords,
      length: passwordLength,
      count: passwordCount,
      options: {
        uppercase: uppercase === 'true',
        lowercase: lowercase === 'true',
        numbers: numbers === 'true',
        symbols: symbols === 'true'
      },
      strength: calculateStrength(passwordLength, {
        uppercase: uppercase === 'true',
        lowercase: lowercase === 'true',
        numbers: numbers === 'true',
        symbols: symbols === 'true'
      })
    };

    return res.status(200).json(createResponse(true, result));
  } catch (error) {
    console.error('Password Generator Error:', error);
    return res.status(500).json(createResponse(false, null, 'Password generation failed', 500));
  }
}

function generatePassword(length, options) {
  let charset = '';
  
  if (options.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (options.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.numbers) charset += '0123456789';
  if (options.symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (charset === '') charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

function calculateStrength(length, options) {
  let score = 0;
  let charsetSize = 0;
  
  if (options.lowercase) charsetSize += 26;
  if (options.uppercase) charsetSize += 26;
  if (options.numbers) charsetSize += 10;
  if (options.symbols) charsetSize += 32;
  
  // Calculate entropy
  const entropy = length * Math.log2(charsetSize);
  
  if (entropy < 30) return 'Very Weak';
  if (entropy < 50) return 'Weak';
  if (entropy < 70) return 'Fair';
  if (entropy < 90) return 'Strong';
  return 'Very Strong';
}
