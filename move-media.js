const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

if (argv._.length !== 2) {
  console.log('Please provide a source (mastodon base path) and a destiantion (to be uploaded with gsutil)');
  process.exit(1);
}

const basePath = path.resolve(process.cwd(), argv._[0], 'public/system/media_attachments/files');
const targetPath = path.resolve(process.cwd(), argv._[1], 'images/media_attachments');
const targetSuffix = 'files';

const sizes = ['original', 'small'];

function handleDir(...prefix) {
  const contents = fs.readdirSync(path.join(basePath, ...prefix));

  if (contents.length === 2 && _.difference(contents, sizes).length === 0) {
    return { prefix };
  }

  return _.flatten(contents.map((content) => handleDir(...prefix, content)));
}

const action = !argv['dry-run'] ? (sourceFile, targetDir, targetFile) => {
  fs.mkdirpSync(targetDir);
  fs.copySync(sourceFile, targetFile);
} : (sourceFile, targetDir, targetFile) => {
  console.log(`mkdirp ${targetDir}`);
  console.log(`cp ${sourceFile} -> ${targetFile}`);
}

const allFiles = handleDir().map((info) => (Object.assign(
  { number: parseInt(info.prefix.join(''), 10).toString() },
  info,
  sizes
    .map((name) => ({ [name]: fs.readdirSync(path.join(basePath, ...info.prefix, name))[0] }))
    .reduce((a, b) => Object.assign({}, a, b))
))).forEach((info) => {
  sizes.forEach((size) => {
    const sourceFile = path.join(basePath, ...info.prefix, size, info[size]);
    const targetDir = path.join(targetPath, info.number, targetSuffix, size);
    const targetFile = path.join(targetDir, 'img_');

    action(sourceFile, targetDir, targetFile);
  })
});
