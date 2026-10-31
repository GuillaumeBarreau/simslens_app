import cors from 'cors';
import express from 'express';

import { routes as discordRoutes } from '../api/discord/index.js';
import BaseClient from './client.js';
import config from './config.js';

const token = config.token;
const client = new BaseClient(token);

global.discordClient = client.client;

client.start();

client.client.once('ready', () => {
  console.log('Discord bot is ready, starting Express server...');

  const app = express();
  const port = Number(config.port) || 5001;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (req, res) => {
    res.json({ status: 'Discord service running', ready: !!(client.client && client.client.user) });
  });

  app.use('/api/discord', discordRoutes);

  app.use((err, req, res) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      details: err.details || undefined,
    });
  });

  app.listen(port, () => {
    console.log(`server_discord API listening on port ${port}`);
  });
});
