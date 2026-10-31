/* Génère l'inventaire des routes à partir de app.js + des *.routes.* */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { inventory } from './route-inventory.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const lines = [];
lines.push('## 🔍 Inventaire des routes API');
lines.push('');
lines.push('> **Généré depuis le code** — ne pas éditer à la main.');
lines.push("> Régénérer après toute modification de `app.js` ou d'un `*.routes.*`.");
lines.push('>');
lines.push('> Colonne *Permission* : valeur passée à `checkPermission()`. Vide = aucune');
lines.push("> vérification de permission sur la route (l'auth de session reste requise");
lines.push('> selon le middleware global).');
lines.push('>');
lines.push('> Routes sans aucun garde : liste motivée dans');
lines.push('> `server/src/__tests__/routeGuards.exceptions.ts`.');
lines.push('');

const groups = inventory();
let total = 0;
for (const group of groups) {
  lines.push(`### \`${group.prefix}\` — module \`${group.module}\``);
  lines.push('');
  lines.push('| Méthode | Chemin | Permission |');
  lines.push('| :------ | :----- | :--------- |');
  for (const rt of group.routes) {
    const perm = rt.permission ? '`' + rt.permission + '`' : '—';
    lines.push(`| \`${rt.method}\` | \`${rt.fullPath}\` | ${perm} |`);
    total++;
  }
  lines.push('');
}

fs.writeFileSync(path.join(ROOT, 'docs/api/reference.md'), lines.join('\n'));
console.log('modules documentés :', groups.length);
console.log('routes totales :', total);
