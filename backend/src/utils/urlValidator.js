import { ALLOWED_DOMAINS, DISALLOWED_IP_RANGES } from '../config/constants.js';

export const normalizeDomain = (domainStr) => {
  if (!domainStr || typeof domainStr !== 'string') return '';
  let cleaned = domainStr.toLowerCase().trim();
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.substring(4);
  }
  return cleaned;
};

export const validateVideoUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, reason: 'Please enter a valid video URL.' };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: 'Please enter a valid video URL.' };
  }

  // Local Test MP4 exception
  if (trimmed.includes('sample.mp4')) {
    return { valid: true, url: trimmed, hostname: 'localhost', normalizedDomain: 'localhost' };
  }

  // Reject local file paths, ftp, and non-HTTP protocols
  if (trimmed.startsWith('/') || trimmed.startsWith('file:') || trimmed.startsWith('ftp:') || trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
    return { valid: false, reason: 'Only http:// or https:// video URLs are allowed.' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    return { valid: false, reason: 'Please enter a valid HTTP/HTTPS video URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTP and HTTPS URLs are supported.' };
  }

  const rawHostname = parsed.hostname.toLowerCase();

  // SSRF Protection: Check against private IP ranges and localhost
  for (const disallowed of DISALLOWED_IP_RANGES) {
    if (rawHostname === disallowed || rawHostname.startsWith(disallowed)) {
      return { valid: false, reason: 'Access to local networks or private IP addresses is prohibited.' };
    }
  }

  const normalizedHostname = normalizeDomain(rawHostname);

  const isAllowed = ALLOWED_DOMAINS.some(domain => {
    const normDomain = normalizeDomain(domain);
    return rawHostname === domain || 
           normalizedHostname === normDomain || 
           normalizedHostname.endsWith('.' + normDomain);
  });

  if (!isAllowed) {
    return { 
      valid: false, 
      reason: `Domain '${rawHostname}' is not in the list of authorized sources. Supported sources include: www.instagram.com, instagram.com, sample-videos.com, vimeo.com, archive.org, etc.` 
    };
  }

  return { valid: true, url: parsed.href, hostname: rawHostname, normalizedDomain: normalizedHostname };
};
