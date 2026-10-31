import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

export default {
  prefix: '!',
  owners: ['Owner ID'],
  token: process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN,
  port: process.env.PORT || 5001,
  serverApiUrl:
    process.env.INTERNAL_SERVER_URL || process.env.SERVER_API_URL || 'http://localhost:5000',
};
