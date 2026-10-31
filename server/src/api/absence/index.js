const controller = require('./absence.controller');
const usecases = require('./usecases');
const repositories = require('./absence.repository');
const routes = require('./absence.routes');

module.exports = { controller, usecases, repositories, routes };
