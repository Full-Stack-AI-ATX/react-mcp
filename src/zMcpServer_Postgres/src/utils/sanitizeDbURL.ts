// Utility function to sanitize database URL for logging
function sanitizeDbURL(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '***';
    }
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, use regex fallback
    return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
  }
}


export default sanitizeDbURL;
