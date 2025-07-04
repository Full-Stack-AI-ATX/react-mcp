const path = require('path');
const resolve = require('resolve');


function resolveAlias(id, basedir, importOptions) {
  const { root } = importOptions;

  // resolve @Styles alias
  if (/^@Styles/.test(id)) {
    const [, filename] = id.split('/');
    return path.resolve(root, 'assets/styles', filename);
  }

  // For other paths, use the `resolve` package which mimics Node's resolution algorithm
  return resolve.sync(id, { basedir });
}


module.exports = {
  plugins: [
    ['postcss-import', {
      root: 'src',
      path: ['app', 'assets', 'components'],
      skipDuplicates: true,
      resolve: resolveAlias

    }],
    'postcss-nesting',
    'postcss-custom-media',
    'postcss-media-minmax',
    'autoprefixer'
  ]
};
