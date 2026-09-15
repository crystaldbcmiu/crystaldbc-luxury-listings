module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // react-native-worklets/plugin powers Reanimated 4 and must stay last.
      "react-native-worklets/plugin",
    ],
  };
};
