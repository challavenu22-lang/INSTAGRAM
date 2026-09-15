import { downloadService } from './src/services/downloadService.js';

const targetUrl = process.argv[2] || 'https://www.instagram.com/p/DculqSCPNJY/';

async function inspectInstagramUrl(urlStr) {
  console.log(`\n========================================`);
  console.log(`Inspecting Instagram Media URL: ${urlStr}`);
  console.log(`========================================\n`);

  try {
    const info = await downloadService.extractDirectMediaInfo(urlStr);
    console.log('Extracted Media Info Result:');
    console.log(JSON.stringify(info, null, 2));

    if (info.url) {
      console.log('\nDirect Media Stream URL:', info.url);
      console.log('Media Type:', info.mediaType);
      console.log('Is Video:', info.isVideo);
    } else {
      console.log('\nUnable to resolve direct media stream for this URL.');
    }
  } catch (err) {
    console.error('Error during media inspection:', err);
  }
}

inspectInstagramUrl(targetUrl);
