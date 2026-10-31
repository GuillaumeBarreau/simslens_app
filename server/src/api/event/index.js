const controller = require('./event.controller');
const service = require('./event.service');
const repositories = require('./event.repository');
const routes = require('./event.routes');
const usecases = require('./usecases');

module.exports = { controller, service, repositories, routes, usecases };
