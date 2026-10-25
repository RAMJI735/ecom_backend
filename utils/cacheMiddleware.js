function publicCache(req, res, next) {
res.set({
  "Cache-Control": "public, s-maxage=1, stale-while-revalidate=59",
  "CDN-Cache-Control": "public, s-maxage=1",
  "Vercel-CDN-Cache-Control": "public, s-maxage=1",
});

  next();
}

// Support default and named imports/exports
publicCache.publicCache = publicCache;
publicCache.default = publicCache;
publicCache.cacheControl = () => publicCache;

module.exports = publicCache;

