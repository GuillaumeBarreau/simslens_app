const controller = require('./talent.controller');
const repositories = require('./talent.repository');
const routes = require('./talent.routes');
const usecases = require('./usecases');

module.exports = { controller, repositories, routes, usecases };
