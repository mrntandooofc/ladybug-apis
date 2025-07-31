const QRCode = require('qrcode');
const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 100, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { text, size = 200, format = 'png', color = '#000000', background = '#ffffff' } = req.query;
    
    if (!text) {
      return res.status(400).json(createResponse(false, null, 'Text parameter is required', 400));
    }

    // Check cache
    const cacheKey = `qr_${Buffer.from(text).toString('base64')}_${size}_${format}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const qrOptions = {
      width: parseInt(size),
      color: {
        dark: color,
        light: background
      },
      type: format
    };

    let qrCodeData;
    if (format === 'svg') {
      qrCodeData = await QRCode.toString(text, { ...qrOptions, type: 'svg' });
    } else {
      qrCodeData = await QRCode.toDataURL(text, qrOptions);
    }

    const result = {
      text: text,
      qrCode: qrCodeData,
      format: format,
      size: parseInt(size),
      color: color,
      background: background
    };

    // Cache result
    cache.set(cacheKey, result, 3600); // 1 hour

    return res.status(200).json(createResponse(true, result));
  } catch (error) {
    console.error('QR Code Error:', error);
    return res.status(500).json(createResponse(false, null, 'QR code generation failed', 500));
  }
}
