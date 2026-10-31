/* Génère la référence des tables à partir de server/prisma/schema.prisma */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const sch = fs.readFileSync(path.join(ROOT, 'server/prisma/schema.prisma'), 'utf8');

const SCALAR = /^(String|Int|BigInt|Float|Decimal|Boolean|DateTime|Json|Bytes)$/;

const models = [];
for (const m of sch.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
  const name = m[1];
  const body = m[2];
  const fields = [];
  const rels = [];
  let mapped = null;
  const indexes = [];

  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//')) continue;
    const mp = t.match(/^@@map\("([^"]+)"\)/);
    if (mp) {
      mapped = mp[1];
      continue;
    }
    const ix = t.match(/^@@(index|unique)\(\[([^\]]+)\]/);
    if (ix) {
      indexes.push(`${ix[1] === 'unique' ? 'unique' : 'index'}(${ix[2].replace(/\s+/g, '')})`);
      continue;
    }
    if (t.startsWith('@@')) continue;

    const fm = t.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
    if (!fm) continue;
    const [, fname, ftypeRaw, isList, isOpt, rest] = fm;
    const cm = rest.match(/\/\/\s*(.+)$/);
    const comment = cm ? cm[1].trim() : '';
    const attrs = rest.replace(/\/\/.*$/, '').trim();

    if (SCALAR.test(ftypeRaw)) {
      const flags = [];
      if (attrs.includes('@id')) flags.push('PK');
      if (attrs.includes('@unique')) flags.push('unique');
      // @default(autoincrement()) : il faut équilibrer les parenthèses, pas
      // s'arrêter à la première fermante.
      const dstart = attrs.indexOf('@default(');
      if (dstart !== -1) {
        let depth = 0,
          end = -1;
        for (let i = dstart + 8; i < attrs.length; i++) {
          if (attrs[i] === '(') depth++;
          else if (attrs[i] === ')') {
            depth--;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }
        if (end !== -1) flags.push(`défaut ${attrs.slice(dstart + 9, end)}`);
      }
      fields.push({
        name: fname,
        type: ftypeRaw + (isList ? '[]' : '') + (isOpt ? '?' : ''),
        flags,
        comment,
      });
    } else {
      const fk = attrs.match(/fields:\s*\[([^\]]+)\]/);
      const od = attrs.match(/onDelete:\s*(\w+)/);
      rels.push({
        name: fname,
        target: ftypeRaw,
        list: !!isList,
        fk: fk ? fk[1].replace(/\s+/g, '') : null,
        onDelete: od ? od[1] : null,
      });
    }
  }
  models.push({ name, mapped, fields, rels, indexes });
}

models.sort((a, b) => a.name.localeCompare(b.name));

const out = [];
out.push('# Référence des tables');
out.push('');
out.push('> **Généré depuis `server/prisma/schema.prisma`** — ne pas éditer à la main.');
out.push("> Le schéma est la source de vérité ; ce fichier n'en est que le reflet lisible.");
out.push('');
out.push(`Base **PostgreSQL 15**, accédée via Prisma. ${models.length} tables.`);
out.push('');
out.push('## Index des tables');
out.push('');
out.push('| Table | Nom SQL | Champs | Relations |');
out.push('| :---- | :------ | -----: | --------: |');
for (const m of models) {
  out.push(
    `| [\`${m.name}\`](#${m.name.replace(/_/g, '')}) | \`${m.mapped || m.name}\` | ${m.fields.length} | ${m.rels.length} |`,
  );
}
out.push('');
out.push('---');
out.push('');

for (const m of models) {
  out.push(`## \`${m.name}\``);
  out.push('');
  if (m.mapped && m.mapped !== m.name) out.push(`Table SQL : \`${m.mapped}\``);
  out.push('');
  out.push('| Champ | Type | Contraintes | Note |');
  out.push('| :---- | :--- | :---------- | :--- |');
  for (const f of m.fields) {
    out.push(
      `| \`${f.name}\` | \`${f.type}\` | ${f.flags.join(', ') || '—'} | ${f.comment || ''} |`,
    );
  }
  out.push('');
  if (m.rels.length) {
    out.push('**Relations**');
    out.push('');
    for (const r of m.rels) {
      const bits = [];
      if (r.fk) bits.push(`via \`${r.fk}\``);
      if (r.onDelete) bits.push(`onDelete: \`${r.onDelete}\``);
      out.push(
        `- \`${r.name}\` → \`${r.target}\`${r.list ? '[]' : ''}${bits.length ? ' — ' + bits.join(', ') : ''}`,
      );
    }
    out.push('');
  }
  if (m.indexes.length) {
    out.push('**Index** : ' + m.indexes.map((i) => `\`${i}\``).join(', '));
    out.push('');
  }
}

fs.writeFileSync(path.join(ROOT, 'docs/database/schema.md'), out.join('\n'));
console.log(
  'tables:',
  models.length,
  '| champs:',
  models.reduce((a, m) => a + m.fields.length, 0),
  '| relations:',
  models.reduce((a, m) => a + m.rels.length, 0),
);
