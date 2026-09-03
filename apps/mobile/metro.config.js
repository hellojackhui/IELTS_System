// Expo SDK 52+ auto-configures Metro for monorepos — no manual watchFolders
// or nodeModulesPaths needed. Keep this minimal so that detection works.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
