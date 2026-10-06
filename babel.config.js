// Metro ya usa babel-preset-expo por defecto; este archivo lo hace explícito para Jest.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
