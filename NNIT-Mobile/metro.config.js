// NNIT Jobs uses React Navigation (App.js). Expo SDK 56 blocks that by default when expo-router is installed
// (it ships inside Expo's tooling), so switch the check off before Metro starts.
process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
