module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      // Must stay last per Reanimated docs.
      "react-native-reanimated/plugin",
    ],
  };
};
