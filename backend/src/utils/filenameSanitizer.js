export const sanitizeFilename = (filename, defaultName = 'video.mp4') => {
  if (!filename || typeof filename !== 'string') {
    return defaultName;
  }

  // Remove path traversal sequences and illegal filesystem characters
  let clean = filename
    .replace(/[/\b\f\n\r\t\v\0]/g, '')
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/\.\.+/g, '.');

  clean = clean.trim();
  if (!clean || clean === '.' || clean === '..') {
    return defaultName;
  }

  // Ensure reasonable extension if missing
  if (!clean.includes('.')) {
    clean += '.mp4';
  }

  return clean.slice(0, 200); // Limit filename length
};
