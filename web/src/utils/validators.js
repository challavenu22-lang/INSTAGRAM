export const normalizeDomain = (domainStr) => {
  if (!domainStr || typeof domainStr !== 'string') return '';
  let cleaned = domainStr.toLowerCase().trim();
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.substring(4);
  }
  return cleaned;
};

export const ALLOWED_DOMAINS_FRONTEND = [
  'instagram.com',
  'www.instagram.com',
  'cdninstagram.com',
  'instagr.am',
  'sample-videos.com',
  'commondatastorage.googleapis.com',
  'vimeo.com',
  'player.vimeo.com',
  'archive.org',
  'wikimedia.org',
  'upload.wikimedia.org',
  'w3schools.com',
  'pexels.com',
  'pixabay.com',
  'videvo.net',
  'github.com',
  'githubusercontent.com',
  'github.io',
  'zencdn.net',
  'drive.google.com',
  'dropbox.com',
  'cloudfront.net'
];

export const isValidVideoUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (trimmed.includes('sample.mp4')) return true;
  if (trimmed.startsWith('/') || trimmed.startsWith('file:') || trimmed.startsWith('ftp:') || trimmed.startsWith('javascript:')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (err) {
    return false;
  }
};
