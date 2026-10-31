/**
 * Rejoue des requêtes sur les vrais routeurs montés sous /1/events, dans
 * l'ordre de app.js, avec le repository du flux simulé (SIMS-204). Lancé sous
 * tsx dans un processus à part par calendarFeedRoutes.test.ts : les routes
 * .ts ne s'importent pas sous vitest.
 *
 * Entrée : argv[2] = JSON { token, requests: [{ method, path }] }
 * Sortie : dernière ligne = JSON [{ status, contentType, body, loggedUrl, errorPath }]
 */
const express = require('express');

const { token, requests } = JSON.parse(process.argv[2]);
const { hashFeedToken } = require('../../calendar_feed.token');
const feedRepo = require('../../calendar_feed.repository');

feedRepo.findByTokenHash = async (hash) =>
  hash === hashFeedToken(token) ? { id: 1, userId: 'u1' } : null;
feedRepo.touch = async () => undefined;
feedRepo.findUserCharacters = async () => [];
feedRepo.findManagedOrGuestRealmIds = async () => [];
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const app = express();
const logged = [];
// Comme morgan : l'URL est lue à la fin de la réponse.
app.use((req, res, next) => {
  res.on('finish', () => logged.push(req.originalUrl));
  next();
});
app.use('/1/events', require('../../../signup').routes);
app.use('/1/events', require('../../../guest').routes);
app.use('/1/events', require('../../../roster').routes);
app.use('/1/events', require('../../../composition').routes);
app.use('/1/events', require('../../../event').routes);
// Comme errorHandler : le chemin de l'erreur vient de req.originalUrl.
// Express reconnaît un error handler à son arité : les 4 paramètres sont requis.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  return res.status(err.statusCode || err.status || 500).json({ errorPath: req.originalUrl });
});

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  for (const { method, path } of requests) {
    const res = await fetch(base + path, { method });
    const text = await res.text();
    let errorPath = null;
    try {
      errorPath = JSON.parse(text).errorPath ?? null;
    } catch {
      errorPath = null;
    }
    // Laisse le temps à l'évènement « finish » d'être émis.
    await new Promise((resolve) => setImmediate(resolve));
    results.push({
      status: res.status,
      contentType: res.headers.get('content-type'),
      body: text.slice(0, 40),
      loggedUrl: logged[logged.length - 1] ?? null,
      errorPath,
    });
  }
  server.close();
  process.stdout.write(`\n${JSON.stringify(results)}\n`);
  process.exit(0);
});
