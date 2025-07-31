const { handleCors, createResponse, checkRateLimit, getClientIP, cache } = require('../lib/utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP, 100, 3600000)) {
    return res.status(429).json(createResponse(false, null, 'Rate limit exceeded', 429));
  }

  try {
    const { type = 'random', count = 5, format = 'hex' } = req.query;
    
    // Check cache
    const cacheKey = `colors_${type}_${count}_${format}_${Math.floor(Date.now() / 300000)}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(createResponse(true, cached));
    }

    const colorData = generateColorPalette(type, parseInt(count), format);
    
    // Cache results
    cache.set(cacheKey, colorData, 300); // 5 minutes

    return res.status(200).json(createResponse(true, colorData));
  } catch (error) {
    console.error('Color API Error:', error);
    return res.status(500).json(createResponse(false, null, 'Color generation failed', 500));
  }
}

function generateColorPalette(type, count, format) {
  const colors = [];
  
  for (let i = 0; i < Math.min(count, 20); i++) {
    let color;
    
    switch (type) {
      case 'warm':
        color = generateWarmColor();
        break;
      case 'cool':
        color = generateCoolColor();
        break;
      case 'pastel':
        color = generatePastelColor();
        break;
      case 'vibrant':
        color = generateVibrantColor();
        break;
      case 'monochrome':
        color = generateMonochromeColor();
        break;
      default:
        color = generateRandomColor();
    }
    
    colors.push({
      hex: color.hex,
      rgb: color.rgb,
      hsl: color.hsl,
      name: getColorName(color.hex)
    });
  }
  
  return {
    type: type,
    count: colors.length,
    format: format,
    colors: colors,
    palette_url: `https://coolors.co/${colors.map(c => c.hex.substring(1)).join('-')}`
  };
}

function generateRandomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  
  return {
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: rgbToHsl(r, g, b)
  };
}

function generateWarmColor() {
  const r = Math.floor(Math.random() * 100) + 156; // 156-255
  const g = Math.floor(Math.random() * 150) + 50;  // 50-199
  const b = Math.floor(Math.random() * 100) + 0;   // 0-99
  
  return {
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: rgbToHsl(r, g, b)
  };
}

function generateCoolColor() {
  const r = Math.floor(Math.random() * 100) + 0;   // 0-99
  const g = Math.floor(Math.random() * 150) + 50;  // 50-199
  const b = Math.floor(Math.random() * 100) + 156; // 156-255
  
  return {
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: rgbToHsl(r, g, b)
  };
}

function generatePastelColor() {
  const r = Math.floor(Math.random() * 100) + 155;
  const g = Math.floor(Math.random() * 100) + 155;
  const b = Math.floor(Math.random() * 100) + 155;
  
  return {
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: rgbToHsl(r, g, b)
  };
}

function generateVibrantColor() {
  const colors = [
    [255, 0, 0], [0, 255, 0], [0, 0, 255],
    [255, 255, 0], [255, 0, 255], [0, 255, 255],
    [255, 128, 0], [128, 255, 0], [0, 128, 255]
  ];
  
  const baseColor = colors[Math.floor(Math.random() * colors.length)];
  const r = Math.max(0, Math.min(255, baseColor[0] + (Math.random() - 0.5) * 100));
  const g = Math.max(0, Math.min(255, baseColor[1] + (Math.random() - 0.5) * 100));
  const b = Math.max(0, Math.min(255, baseColor[2] + (Math.random() - 0.5) * 100));
  
  return {
    hex: rgbToHex(Math.floor(r), Math.floor(g), Math.floor(b)),
    rgb: `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`,
    hsl: rgbToHsl(Math.floor(r), Math.floor(g), Math.floor(b))
  };
}

function generateMonochromeColor() {
  const gray = Math.floor(Math.random() * 256);
  return {
    hex: rgbToHex(gray, gray, gray),
    rgb: `rgb(${gray}, ${gray}, ${gray})`,
    hsl: `hsl(0, 0%, ${Math.round(gray / 255 * 100)}%)`
  };
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function getColorName(hex) {
  const colorNames = {
    '#FF0000': 'Red', '#00FF00': 'Green', '#0000FF': 'Blue',
    '#FFFF00': 'Yellow', '#FF00FF': 'Magenta', '#00FFFF': 'Cyan',
    '#000000': 'Black', '#FFFFFF': 'White', '#808080': 'Gray',
    '#FFA500': 'Orange', '#800080': 'Purple', '#FFC0CB': 'Pink'
  };
  
  return colorNames[hex.toUpperCase()] || 'Custom Color';
}
