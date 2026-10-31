const controller = require('./attendance.controller');
const usecases = require('./usecases');
const repositories = require('./attendance.repository');
const routes = require('./attendance.routes');

module.exports = { controller, usecases, repositories, routes };
