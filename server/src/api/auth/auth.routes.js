const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const config = require('../../shared/config');
const characterRepository = require('../character/character.repository');
const { createDevLogin } = require('./devLogin');

router.get('/bnet', authController.loginBnet);

// Connexion de développement : 404 hors développement local (voir devLogin.js).
router.get(
  '/dev-login',
  createDevLogin({
    env: process.env,
    clientUrl: config.urls.client,
    findCharactersByUserId: characterRepository.listCharactersByUserId,
  }),
);

router.get('/bnet/callback', authController.loginBnetCallback);

router.get('/me', authController.getMe);

router.get('/logout', authController.logout);

router.get('/discord', authController.linkDiscord);
router.get('/discord/callback', authController.linkDiscordCallback);

module.exports = router;
