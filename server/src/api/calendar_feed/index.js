// Pas de fichier de routes propre : les routes du flux sont déclarées dans
// event.routes (montage /1/events), app.js n'ayant pas de montage dédié.
const controller = require('./calendar_feed.controller');
const usecases = require('./usecases');
const repositories = require('./calendar_feed.repository');

module.exports = { controller, usecases, repositories };
