import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { logger } from '../utils/logger.js';

const MAC_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getExecutableAndArgs() {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_EXECUTION_ENV || process.env.NOW_REGION);
  const isMacChrome = fs.existsSync(MAC_CHROME_PATH);

  if (isVercel || !isMacChrome) {
    try {
      const chromium = await import('@sparticuz/chromium');
      return {
        executablePath: await chromium.default.executablePath(),
        args: chromium.default.args,
        headless: chromium.default.headless
      };
    } catch (e) {
      logger.warn('[PUPPETEER] Failed to load @sparticuz/chromium:', { error: e.message });
    }
  }

  if (isMacChrome) {
    return {
      executablePath: MAC_CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ],
      headless: 'new'
    };
  }

  return null;
}

export async function extractWithPuppeteer(targetUrl) {
  let browser = null;
  try {
    const launchConfig = await getExecutableAndArgs();
    if (!launchConfig || !launchConfig.executablePath) {
      logger.warn('[PUPPETEER] No browser executable available for environment');
      return null;
    }

    const match = targetUrl.match(/\/(reel|p|tv)\/([^\/]+)/);
    const shortcode = match ? match[2] : null;

    logger.info('[PUPPETEER] Launching browser:', { targetUrl, shortcode, isVercel: Boolean(process.env.VERCEL) });

    browser = await puppeteer.launch({
      executablePath: launchConfig.executablePath,
      headless: launchConfig.headless !== undefined ? launchConfig.headless : 'new',
      args: launchConfig.args || ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const videoUrls = new Set();
    const imgUrls = new Set();

    page.on('response', async (response) => {
      const resUrl = response.url();
      if (resUrl.includes('cdninstagram.com') || resUrl.includes('fbcdn.net')) {
        if (!resUrl.includes('static.cdninstagram.com') && 
            !resUrl.includes('profile_pic') && 
            !resUrl.includes('rsrc.php') &&
            !resUrl.includes('s100x100') &&
            !resUrl.includes('s150x150')) {
          if (resUrl.includes('.mp4') || resUrl.includes('/o1/v/') || resUrl.includes('bytestart=')) {
            videoUrls.add(resUrl);
          } else if (resUrl.includes('.jpg') || resUrl.includes('.jpeg') || resUrl.includes('.webp')) {
            imgUrls.add(resUrl);
          }
        }
      }
    });

    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    logger.info('[PUPPETEER] Navigating to embed page first:', { embedUrl });

    try {
      await page.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await delay(1200);
    } catch (e) {
      logger.warn('[PUPPETEER] Embed page navigation error:', { error: e.message });
    }

    let embedVideo = await page.$eval('video', el => el.src).catch(() => null);
    let embedImg = await page.$eval('img.EmbeddedMediaImage, img', el => el.src).catch(() => null);

    if (embedVideo) {
      logger.info('[PUPPETEER] Found video source on embed page:', { embedVideo: embedVideo.slice(0, 100) });
      await browser.close();
      return {
        url: embedVideo,
        isVideo: true,
        mediaType: 'video',
        contentType: 'video/mp4',
        thumbnailUrl: embedImg || null
      };
    }

    logger.info('[PUPPETEER] Navigating to full post page:', { targetUrl });
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 12000 });
      await delay(1500);
    } catch (e) {
      logger.warn('[PUPPETEER] Full page navigation error:', { error: e.message });
    }

    const pageVideoSrc = await page.$eval('video', el => el.src).catch(() => null);
    if (pageVideoSrc || videoUrls.size > 0) {
      const selectedVid = pageVideoSrc || Array.from(videoUrls)[0];
      const selectedImg = embedImg || Array.from(imgUrls)[0] || null;
      logger.info('[PUPPETEER] Extracted video media:', { selectedVid: selectedVid.slice(0, 100) });
      await browser.close();
      return {
        url: selectedVid,
        isVideo: true,
        mediaType: 'video',
        contentType: 'video/mp4',
        thumbnailUrl: selectedImg
      };
    }

    const pageImgs = Array.from(imgUrls);
    if (pageImgs.length > 0) {
      const isCarousel = pageImgs.length > 1;
      const primaryImg = (embedImg && !embedImg.includes('profile_pic') && !embedImg.includes('s100x100')) ? embedImg : pageImgs[0];
      const itemsList = pageImgs.map((u, idx) => ({
        index: idx + 1,
        url: u,
        isVideo: false,
        mediaType: 'image',
        contentType: 'image/jpeg',
        thumbnailUrl: u
      }));

      logger.info('[PUPPETEER] Extracted image/carousel media:', { primaryImg: primaryImg.slice(0, 100), count: itemsList.length });
      await browser.close();
      return {
        url: primaryImg,
        isVideo: false,
        mediaType: isCarousel ? 'carousel' : 'image',
        contentType: 'image/jpeg',
        thumbnailUrl: primaryImg,
        items: isCarousel ? itemsList : null
      };
    }

    await browser.close();
    return null;
  } catch (err) {
    logger.error('[PUPPETEER] Extraction error:', { error: err.message });
    if (browser) await browser.close().catch(() => {});
    return null;
  }
}
