/**
 * Rejoue des requêtes sur les vrais routeurs, montés comme dans app.js, avec
 * des repositories simulés (SIMS-173). Lancé sous tsx dans un processus à
 * part par checkPermission.routes.test.js : les routes .ts ne s'importent pas
 * sous vitest.
 *
 * Entrée : argv[2] = JSON [{ method, path, body? }]
 * Sortie : dernière ligne = JSON [{ status, body }]
 */
const express = require('express');

const realmRepo = require('../../../api/realm/realm.repository');
const characterRepo = require('../../../api/character/character.repository');
const eventRepo = require('../../../api/event/event.repository');

// Un administrateur de la guilde 1. Le personnage 5 appartient à la guilde 2.
realmRepo.getRealmUserRole = async (realmId) => (realmId === 1 ? 'admin' : null);
characterRepo.findCharacterById = async (id) => (Number(id) === 5 ? { id: 5, realmId: 2 } : null);
eventRepo.findById = async () => null;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = { id: 'u1' };
  next();
});
app.use('/1/character', require('../../../api/character').routes);
app.use('/1/realms', require('../../../api/realm').routes);
app.use('/1', require('../../../api/wishlist').routes);
app.use('/1', require('../../../api/talent').routes);
app.use('/1/attendance', require('../../../api/attendance').routes);
// Erreur levée par un handler : signale qu’un scénario a passé checkPermission.
// Express reconnaît un error handler à son arité : les 4 paramètres sont requis.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ handlerError: true }));

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  for (const { method, path, body } of JSON.parse(process.argv[2])) {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    results.push({ status: res.status, body: await res.json().catch(() => null) });
  }
  server.close();
  process.stdout.write(`\n${JSON.stringify(results)}\n`);
  process.exit(0);
});
