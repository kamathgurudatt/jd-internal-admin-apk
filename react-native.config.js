module.exports = {
  project: {
    android: {
      packageName: 'com.jdadminapp',
      sourceDir: './android',
    },
  },
  // DIAGNOSTIC: disable all native module autolinking so CMake doesn't fail
  // on missing JNI directories. Remove these exclusions when adding modules back.
  dependencies: {
    'react-native-screens':              { platforms: { android: null } },
    'react-native-safe-area-context':    { platforms: { android: null } },
    'react-native-gesture-handler':      { platforms: { android: null } },
    'react-native-encrypted-storage':    { platforms: { android: null } },
    '@react-navigation/native':          { platforms: { android: null } },
    '@react-navigation/bottom-tabs':     { platforms: { android: null } },
    '@react-navigation/stack':           { platforms: { android: null } },
  },
};
