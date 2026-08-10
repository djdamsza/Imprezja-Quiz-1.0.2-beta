/** Konfiguracja electron-builder dla kanału Beta (osobny appId / nazwa w /Applications). */
const base = require('./package.json').build;

module.exports = {
  ...base,
  appId: 'pl.imprezja.votebattle.beta',
  productName: 'Imprezja Quiz Beta',
  directories: {
    ...(base.directories || {}),
    /* Osobny katalog — NIE pod dist/, żeby poprzednie buildy nie weszły do asara. */
    output: 'release-beta'
  },
  files: [
    ...(base.files || ['**/*']),
    '!dist/**',
    '!release-beta/**',
    '!.cursor/**',
    '!.git/**'
  ],
  mac: {
    ...(base.mac || {}),
    artifactName: 'Imprezja Quiz Beta-${version}-${arch}.${ext}',
    target: [{ target: 'dmg' }]
  },
  dmg: {
    ...(base.dmg || {}),
    artifactName: 'Imprezja Quiz Beta-${version}-${arch}.${ext}'
  },
  nsis: {
    ...(base.nsis || {}),
    shortcutName: 'Imprezja Quiz Beta'
  },
  win: {
    ...(base.win || {}),
    executableName: 'ImprezjaQuizBeta'
  }
};
