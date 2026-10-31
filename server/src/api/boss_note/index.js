const controller = require('./boss_note.controller');
const usecases = require('./usecases');
const repositories = require('./boss_note.repository');
const routes = require('./boss_note.routes');

module.exports = { controller, usecases, repositories, routes };
