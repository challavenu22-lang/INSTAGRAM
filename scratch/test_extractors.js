import https from 'https';

function getDdMedia(shortcode) {
  return new Promise((resolve) => {
    https.get(`https://ddinstagram.com/reel/${shortcode}`, {
      headers: {
        'User-Agent': 'TelegramBot (like TwitterBot)',
        'Accept': 'text/html'
      },
      timeout: 8000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const match = body.match(/<meta[^>]*property=["']og:video["'][^>]*content=["']([^"']+)["']/i) ||
                      body.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:video["']/i) ||
                      body.match(/src=["'](https:\/\/[^"']+\.mp4[^"']*)["']/i);
        resolve(match ? match[1] : null);
      });
    }).on('error', () => resolve(null));
  });
}

const mediaUrl = await getDdMedia('C-0zZ0_x1X_');
console.log('DDInstagram mediaUrl result:', mediaUrl);
