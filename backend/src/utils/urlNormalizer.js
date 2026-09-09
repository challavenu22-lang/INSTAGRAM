/**
 * Normalizes an Instagram or video URL by stripping tracking / query parameters
 * (e.g., utm_source, ig_web_copy_link, igsh, stkn, etc.) and standardizing the format.
 *
 * Example:
 *  Input:  "https://www.instagram.com/reel/DbcUhjbzI-pr/?utm_source=ig_web_copy_link&stkn=N"
 *  Output: "https://www.instagram.com/reel/DbcUhjbzI-pr/"
 */
export function normalizeVideoUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Match Instagram post, reel, or TV shortcodes
  const match = trimmed.match(/https?:\/\/(?:www\.)?instagram\.com\/(reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1] && match[2]) {
    const type = match[1].toLowerCase();
    const shortcode = match[2];
    return `https://www.instagram.com/${type}/${shortcode}/`;
  }

  // Generic fallback: strip query string and hash
  try {
    const u = new URL(trimmed);
    const cleanPath = (u.origin + u.pathname).replace(/\/+$/, '');
    return cleanPath + '/';
  } catch (e) {
    return trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '') + '/';
  }
}
