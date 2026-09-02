// Constants & Allowlist Configuration

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit

export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: '7d',
  SESSION_DAYS: 7,
  EMAIL_VERIFICATION_HOURS: 24,
  PASSWORD_RESET_HOURS: 1,
};

// Supported authorized video domains / URL patterns
export const ALLOWED_DOMAINS = [
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

export const DISALLOWED_IP_RANGES = [
  '0.0.0.0',
  '127.0.0.1',
  'localhost',
  '::1',
  '10.',
  '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
  '192.168.',
  '169.254.'
];
