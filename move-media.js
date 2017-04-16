const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

if (argv._.length !== 2) {
  console.log('Please provide a source (mastodon base path) and a destiantion (to be uploaded with gsutil)');
  process.exit(1);
}

const basePath = path.resolve(process.cwd(), argv._[0], 'public/system');
const targetPath = path.resolve(process.cwd(), argv._[1], 'images/media_attachments');
const targetSuffix = 'files';

const config = {
  "accounts": {
    avatars: ["original", "static"],
    headers: ["original", "static"],
  },
  media_attachments: {
    files: ["original", "small"]
  },
  preview_cards: {
    images: ["original"],
  },
};

const action = !argv['dry-run'] ? (sourceFile, targetDir, targetFile) => {
  fs.mkdirpSync(targetDir);
  fs.copySync(sourceFile, targetFile);
} : (sourceFile, targetDir, targetFile) => {
  console.log(`mkdirp ${targetDir}`);
  console.log(`cp ${sourceFile} -> ${targetFile}`);
}

Object.keys(config).forEach((type) => {
  const typeBase = path.join(basePath, type);

  if (!fs.existsSync(typeBase)) {
    console.log(`skipping ${typeBase}`);
    return;
  }

  const subtypes = config[type];
  Object.keys(subtypes).forEach((subtype) => {
    const subtypeBase = path.join(typeBase, subtype);

    if (!fs.existsSync(subtypeBase)) {
      console.log(`skipping ${subtypeBase}`);
      return;
    }

    const sizes = subtypes[subtype];
    function handleDir(...prefix) {
      const contents = fs.readdirSync(path.join(subtypeBase, ...prefix));

      if (contents.length <= sizes.length && _.difference(contents, sizes).length === 0) {
        return { prefix, sizes: contents };
      }

      return _.flatten(contents.map((content) => handleDir(...prefix, content)));
    }

    handleDir().map((info) => (Object.assign(
      { number: parseInt(info.prefix.join(''), 10).toString() },
      info,
      info.sizes
        .map((name) => ({ [name]: fs.readdirSync(path.join(subtypeBase, ...info.prefix, name))[0] }))
        .reduce((a, b) => Object.assign({}, a, b))
    ))).forEach((info) => {
      info.sizes.forEach((size) => {
        const sourceFile = path.join(subtypeBase, ...info.prefix, size, info[size]);
        const targetDir = path.join(targetPath, info.number, targetSuffix, size);
        const targetFile = path.join(targetDir, 'img_');

        action(sourceFile, targetDir, targetFile);
      })
    });
  });
})
