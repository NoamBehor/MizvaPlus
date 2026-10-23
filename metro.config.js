const fs = require('node:fs');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = withNativeWind(getDefaultConfig(__dirname), {
  input: path.resolve(__dirname, 'global.css'),
});

const sourceRoot = path.resolve(__dirname, 'src');
const aliasExtensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
const upstreamResolveRequest = config.resolver.resolveRequest;

function resolveSrcAlias(moduleName) {
  if (!moduleName.startsWith('@/')) {
    return null;
  }

  const base = path.resolve(sourceRoot, moduleName.slice(2));
  const candidates = [
    base,
    ...aliasExtensions.map((ext) => base + ext),
    ...aliasExtensions.map((ext) => path.join(base, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Ignore unreadable candidates and keep searching.
    }
  }

  return null;
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const aliased = resolveSrcAlias(moduleName);
  if (aliased) {
    return { type: 'sourceFile', filePath: aliased };
  }

  if (typeof upstreamResolveRequest === 'function') {
    return upstreamResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
