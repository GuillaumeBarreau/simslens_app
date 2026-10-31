/**
 * Inventaire statique des routes de l'API, sans rien importer : app.js lance des
 * planificateurs et des connexions au chargement, et les fichiers de routes .ts
 * ne se chargent pas hors tsx.
 *
 * Lu par :
 *   - scripts/gen-api-docs.mjs         → docs/api/reference.md
 *   - server/src/__tests__/routeGuards.test.ts → toute route a un garde, ou une exception motivée
 *
 * Gardes reconnus (au niveau de la route, du routeur via router.use, ou du montage
 * dans app.js) : checkPermission(…), requireUser, requireBearer, requireUserOrInternal, clerkAuth.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_SRC = path.join(ROOT, 'server', 'src');
const GUARD_NAMES = [
  'requireUser',
  'requireBearer',
  'requireUserOrInternal',
  'requireInternal',
  'clerkAuth',
];
const VERBS = ['get', 'post', 'put', 'patch', 'delete'];

/**
 * Renvoie l'index de la parenthèse fermante qui correspond à celle ouverte en
 * `open`, en ignorant chaînes, gabarits et commentaires. -1 si non trouvée.
 */
function matchParen(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      i = src.indexOf('\n', i);
      if (i === -1) return -1;
    } else if (c === '/' && n === '*') {
      i = src.indexOf('*/', i + 2) + 1;
      if (i === 0) return -1;
    } else if (c === "'" || c === '"' || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
    } else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return -1;
}

/** Gardes présents dans un extrait de code (arguments d'un appel). */
function guardsIn(text) {
  const guards = [];
  for (const m of text.matchAll(/checkPermission\(\s*Permission\.([A-Z_]+)/g)) {
    guards.push(`checkPermission(${m[1]})`);
  }
  if (/checkPermission\(/.test(text) && !guards.length) guards.push('checkPermission');
  for (const name of GUARD_NAMES) if (new RegExp(`\\b${name}\\b`).test(text)) guards.push(name);
  return guards;
}

/**
 * Routes déclarées dans le source d'un routeur Express.
 * @returns {{ method: string, path: string, permission: string|null, guards: string[] }[]}
 */
export function parseRoutes(src) {
  const calls = [];
  const re = new RegExp(`\\brouter\\.(${VERBS.join('|')}|use)\\(`, 'g');
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1;
    const close = matchParen(src, open);
    if (close === -1) continue;
    calls.push({ kind: m[1], args: src.slice(open + 1, close) });
    re.lastIndex = close;
  }

  const routes = [];
  const routerGuards = [];
  for (const call of calls) {
    if (call.kind === 'use') {
      routerGuards.push(...guardsIn(call.args));
      continue;
    }
    const pathM = call.args.match(/^\s*(['"`])([^'"`]*)\1/);
    if (!pathM) continue;
    const own = guardsIn(call.args.slice(pathM[0].length));
    const permM = call.args.match(/checkPermission\(\s*Permission\.([A-Z_]+)/);
    routes.push({
      method: call.kind.toUpperCase(),
      path: pathM[2],
      permission: permM ? permM[1] : null,
      guards: [...routerGuards, ...own],
    });
  }
  return routes;
}

/** Montages de app.js : préfixe, source des routes, gardes posés au montage. */
export function readMounts() {
  const appJs = fs.readFileSync(path.join(SERVER_SRC, 'app.js'), 'utf8');
  const sources = {};
  for (const r of appJs.matchAll(
    /const\s+(?:\{\s*routes:\s*(\w+)\s*\}|(\w+))\s*=\s*require\('\.\/((?:api\/[\w_]+)|dataUpdater)(?:\/[\w.]+)?'\)/g,
  )) {
    sources[r[1] || r[2]] = r[3];
  }
  const mounts = [];
  for (const u of appJs.matchAll(/app\.use\(\s*'([^']+)',\s*([^)]*)\)/g)) {
    const args = u[2].split(',').map((a) => a.trim());
    const alias = args[args.length - 1];
    if (!sources[alias]) continue;
    mounts.push({
      prefix: u[1],
      source: sources[alias],
      guards: guardsIn(args.slice(0, -1).join(',')),
    });
  }
  return mounts;
}

/** Fichier de routes d'une source (module api/<dir> ou dataUpdater). */
function routesFile(source) {
  if (source === 'dataUpdater') return path.join(SERVER_SRC, 'dataUpdater.js');
  const dir = path.join(SERVER_SRC, source);
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).find((x) => /\.routes\.(js|ts)$/.test(x));
  return f ? path.join(dir, f) : null;
}

/**
 * Inventaire groupé par montage, dans l'ordre de app.js.
 * @returns {{ prefix: string, module: string, file: string, routes: object[] }[]}
 */
export function inventory() {
  const seen = new Set();
  const groups = [];
  for (const mount of readMounts()) {
    const file = routesFile(mount.source);
    const key = mount.prefix + mount.source;
    if (!file || seen.has(key)) continue;
    seen.add(key);
    const module = mount.source.replace(/^api\//, '');
    const routes = parseRoutes(fs.readFileSync(file, 'utf8')).map((r) => ({
      ...r,
      fullPath: (mount.prefix + r.path).replace(/\/$/, '') || mount.prefix,
      guards: [...mount.guards, ...r.guards],
    }));
    if (!routes.length) continue;
    groups.push({
      prefix: mount.prefix,
      module,
      file: path.relative(ROOT, file).split(path.sep).join('/'),
      routes,
    });
  }
  return groups;
}
