const controller = require('./device_auth.controller');
const usecases = require('./usecases');
const repositories = require('./device_auth.repository');
const routes = require('./device_auth.routes');

module.exports = { controller, usecases, repositories, routes };
