export function readSecurityConfig(env = process.env) {
  const frameAncestors = (env.FRAME_ANCESTORS || '').split(/[\s,]+/).filter(Boolean).map(value => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.hostname.includes('*')) throw new Error('FRAME_ANCESTORS must contain exact HTTP(S) origins');
    return url.origin;
  });
  const cookieMode = env.SECURE_COOKIE || 'auto';
  if (!['auto', 'true', 'false'].includes(cookieMode)) throw new Error('SECURE_COOKIE must be auto, true or false');
  const trustedProxies = (env.TRUSTED_PROXY_CIDRS || '').split(/[\s,]+/).filter(Boolean);
  if (trustedProxies.some(value => !value.includes('/') || ['0.0.0.0/0', '::/0'].includes(value))) throw new Error('TRUSTED_PROXY_CIDRS requires explicit, limited CIDRs');
  return { frameAncestors: [...new Set(frameAncestors)], cookieMode, trustedProxies };
}
export const cookieSecure = (req, config) => config.cookieMode === 'true' || (config.cookieMode === 'auto' && req.secure);
