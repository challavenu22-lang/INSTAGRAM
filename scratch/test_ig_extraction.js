import https from 'https';
import { instagramGetUrl } from 'instagram-url-direct';

async function testIG() {
  const shortcode = 'C-0zZ0_x1X_';
  const targetUrl = `https://www.instagram.com/reel/${shortcode}/`;

  console.log('--- TEST 1: instagram-url-direct ---');
  try {
    const res = await instagramGetUrl(targetUrl);
    console.log('instagram-url-direct res:', res);
  } catch (e) {
    console.log('instagram-url-direct error:', e.message);
  }

  console.log('\n--- TEST 2: Embed Page Scraping ---');
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  const body = await new Promise((resolve) => {
    https.get(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
  });

  console.log('Embed HTML length:', body.length);
  const videoMatches = body.match(/https?:\/\/[^\s"'<>]*(?:scontent|cdninstagram|fbcdn)[^\s"'<>]*?(?:\.mp4|\.m4a|\/o1\/v\/|\/v\/t[0-9]*\/|efg=|video_dashinit|audio_dashinit)[^\s"'<>]+/gi) || [];
  console.log('Video matches found:', videoMatches.length);
  if (videoMatches.length > 0) {
    console.log('First video match:', videoMatches[0].slice(0, 120));
  }

  console.log('\n--- TEST 3: GraphQL / JSON Endpoint ---');
  const jsonUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;
  const jsonData = await new Promise((resolve) => {
    https.get(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'X-IG-App-ID': '936619743392459'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
  });
  console.log('GraphQL endpoint status:', jsonData.status, 'data snippet:', jsonData.data.slice(0, 150));
}

testIG();
