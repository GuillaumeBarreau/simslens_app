const controller = require('./signup.controller');
const usecases = require('./usecases');
const repositories = require('./signup.repository');
const routes = require('./signup.routes');

module.exports = { controller, usecases, repositories, routes };
