const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const zlib = require('zlib');

/**
 * Fichier des objets équipables publié par Raidbots (≈ 50 Mo).
 *
 * Il n'est plus versionné (SIMS-284) : la redistribution des données Raidbots n'est pas
 * couverte par la licence du dépôt. Il est téléchargé à la demande, au premier seed ou
 * au premier lancement d'un script qui en a besoin, puis conservé sur le disque
 * (ignoré par .gitignore).
 */
const SOURCE_URL = 'https://www.raidbots.com/static/data/live/equippable-items.json';
const DEFAULT_TARGET_PATH = path.join(__dirname, 'equippable-items.json');

/** En dessous, le fichier reçu n'est pas le bon (page d'erreur, réponse tronquée…). */
const MIN_BYTES = 1024 * 1024;
const MIN_ITEMS = 1000;

/** Télécharge `url` dans `destPath` (suit les redirections, décompresse gzip/deflate). */
function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const fail = (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    };
    const req = https.get(
      url,
      {
        headers: {
          'Accept-Encoding': 'gzip, deflate',
          'User-Agent': 'sims-tracking-update-script',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlink(destPath, () => {});
          return download(res.headers.location, destPath).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          return fail(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const encoding = res.headers['content-encoding'];
        let stream = res;
        if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
        else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());

        stream.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
        stream.on('error', fail);
      },
    );
    req.on('error', fail);
  });
}

/** Lève une erreur si le fichier téléchargé est trop petit pour être le bon. */
function assertDownloadSize(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < MIN_BYTES) {
    throw new Error(`Downloaded file is suspiciously small (${size} bytes), aborting.`);
  }
  return size;
}

/** Lève une erreur si le contenu n'a pas la forme attendue (tableau d'objets). */
function assertItemsShape(items) {
  if (!Array.isArray(items) || items.length < MIN_ITEMS) {
    throw new Error(`Remote file shape unexpected (length=${items?.length}), aborting.`);
  }
  return items;
}

/** Déplace un fichier, y compris d'un système de fichiers à un autre (os.tmpdir()). */
function moveFile(from, to) {
  try {
    fs.renameSync(from, to);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    fs.copyFileSync(from, to);
    fs.unlinkSync(from);
  }
}

/**
 * Garantit la présence du fichier des objets équipables : ne fait rien s'il existe,
 * sinon le télécharge depuis Raidbots, le valide (taille, forme) puis l'installe.
 *
 * @param {{ targetPath?: string, download?: (url: string, dest: string) => Promise<void>,
 *   log?: Pick<Console, 'log'> }} [options]
 * @returns {Promise<string>} le chemin du fichier
 */
async function ensureEquippableItems({
  targetPath = DEFAULT_TARGET_PATH,
  download: downloadFile = download,
  log = console,
} = {}) {
  if (fs.existsSync(targetPath)) return targetPath;

  log.log(`📥 ${path.basename(targetPath)} absent : téléchargement depuis ${SOURCE_URL}`);
  const tmpPath = path.join(os.tmpdir(), `equippable-items-${process.pid}-${Date.now()}.json`);

  try {
    await downloadFile(SOURCE_URL, tmpPath);
  } catch (err) {
    fs.rmSync(tmpPath, { force: true });
    throw new Error(
      `Impossible de télécharger ${SOURCE_URL} (${err && err.message ? err.message : err}). ` +
        `Vérifiez l'accès réseau, ou placez le fichier manuellement dans ${targetPath} ` +
        `(npm run update-equippable-items dans server/).`,
    );
  }

  try {
    const size = assertDownloadSize(tmpPath);
    assertItemsShape(JSON.parse(fs.readFileSync(tmpPath, 'utf8')));
    moveFile(tmpPath, targetPath);
    log.log(`✅ ${path.basename(targetPath)} installé (${(size / 1024 / 1024).toFixed(1)} Mo).`);
    return targetPath;
  } finally {
    fs.rmSync(tmpPath, { force: true });
  }
}

module.exports = {
  SOURCE_URL,
  DEFAULT_TARGET_PATH,
  MIN_BYTES,
  MIN_ITEMS,
  download,
  assertDownloadSize,
  assertItemsShape,
  moveFile,
  ensureEquippableItems,
};
