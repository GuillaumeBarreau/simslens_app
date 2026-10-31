const controller = require('./character.controller');
const repositories = require('./character.repository');
const routes = require('./character.routes');
const usecases = require('./usecases');

module.exports = { controller, repositories, routes, usecases };
