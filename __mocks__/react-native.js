module.exports = {
  Platform: { OS: 'ios', select: obj => obj?.ios ?? obj?.default },
  StatusBar: { currentHeight: 0 },
  Dimensions: { get: () => ({ width: 375, height: 667 }) },
  // Minimal stubs
  NativeModules: {},
  StyleSheet: {},
}
