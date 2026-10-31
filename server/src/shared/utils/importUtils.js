function splitCsvLine(line) {
  const vals = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        vals.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  vals.push(cur.trim());
  return vals;
}

function normalizeKey(k) {
  if (!k && k !== 0) return '';
  return String(k)
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getVal(row, candidates) {
  for (const c of candidates) {
    if (row[c] != null && row[c] !== '') return row[c];
    const nk = normalizeKey(c);
    for (const rk of Object.keys(row)) {
      if (normalizeKey(rk) === nk) return row[rk];
    }
  }
  return null;
}

function parseNameRealm(raw) {
  if (!raw) return { name: '', realm: '' };
  const s = String(raw).trim();
  const lastDash = s.lastIndexOf('-');
  let namePart = s;
  let realmPart = '';
  if (lastDash > 0) {
    namePart = s.slice(0, lastDash).trim();
    realmPart = s.slice(lastDash + 1).trim();
  }
  return { name: namePart, realm: realmPart };
}

/**
 * Clé d'identification d'un personnage, insensible à la casse.
 *
 * Elle sert à rapprocher les lignes d'un import des personnages connus : les
 * fichiers produits par les add-ons ne respectent pas une casse stable.
 *
 * @param {string} name
 * @param {string} realm
 * @returns {string} « nom|royaume » en minuscules
 */
function characterKey(name, realm) {
  return `${String(name).toLowerCase()}|${String(realm).toLowerCase()}`;
}

module.exports = {
  characterKey,
  splitCsvLine,
  normalizeKey,
  getVal,
  parseNameRealm,
};
