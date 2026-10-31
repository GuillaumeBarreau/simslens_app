// Script CommonJS exécuté directement par Node (sans bundler) : `require` est voulu.
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

// Clés recopiées du .env racine vers le .env de chaque workspace.
// `optional: [...]` = clés recopiées seulement si présentes à la source,
// sans warning "MISSING_IN_SOURCE" (surcharges facultatives).
const SERVICES = {
  app: {
    dest: path.join(__dirname, '../app/.env'),
    keys: ['VITE_API_BASE_URL', 'VITE_WOW_EXTENSION', 'VITE_CURRENT_SEASON'],
    // Vide ou absent : lien d'invitation du bot masqué.
    optional: ['VITE_DISCORD_CLIENT_ID'],
  },
  app_dashboard: {
    dest: path.join(__dirname, '../app_dashboard/.env'),
    keys: ['VITE_CLERK_PUBLISHABLE_KEY'],
    optional: ['VITE_BASE_URL'],
  },
  server: {
    dest: path.join(__dirname, '../server/.env'),
    keys: [
      'NODE_ENV',
      'PORT',
      'CLIENT_URL',
      'SERVER_API_URL',
      'SESSION_SECRET',
      'DATABASE_URL',
      'REDIS_HOST',
      'REDIS_PORT',
      'BNET_ID',
      'BNET_SECRET',
      'CLERK_PUBLISHABLE_KEY',
      'ENABLE_DISCORD_BOT',
      'DISCORD_BOT_TOKEN',
      'DISCORD_SERVER_URL',
      'DISCORD_CLIENT_ID',
      'DISCORD_CLIENT_SECRET',
    ],
    optional: [
      'LOG_LEVEL',
      'INIT_DATA_ON_START',
      'DISCORD_CHANNEL_ID',
      'REPORT_QUEUE_CONCURRENCY',
      'ENABLE_DISCORD_MOCK',
      'INCLUDE_STACK_IN_RESPONSES',
      'ENABLE_DEV_LOGIN',
      'CLERK_ADMIN_USER_IDS',
    ],
  },
  server_discord: {
    dest: path.join(__dirname, '../server_discord/.env'),
    keys: ['DISCORD_BOT_TOKEN', 'SERVER_API_URL', 'CLIENT_URL'],
    optional: [
      'NODE_ENV',
      'INTERNAL_SERVER_URL',
      'DISCORD_CHANNEL_ID',
      'DISCORD_ANNOUNCE_CHANNEL_ID',
      'DISCORD_RAID_CATEGORY_ID',
    ],
  },
};

const args = process.argv.slice(2);
const sourceEnvFile = args[0] || '.env';
const sourcePath = path.join(__dirname, '..', sourceEnvFile);

function parseEnv(content) {
  const env = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
  return env;
}

function processService(serviceName, config, sourceEnv) {
  console.log(`Processing ${serviceName}...`);

  let newContent = `# Generated from ${sourceEnvFile}\n`;
  const missingKeys = [];

  for (const key of config.keys) {
    if (sourceEnv[key] !== undefined) {
      newContent += `${key}=${sourceEnv[key]}\n`;
    } else {
      missingKeys.push(key);
      newContent += `# ${key}=MISSING_IN_SOURCE\n`;
    }
  }

  for (const key of config.optional || []) {
    if (sourceEnv[key] !== undefined && sourceEnv[key] !== '') {
      newContent += `${key}=${sourceEnv[key]}\n`;
    }
  }

  fs.writeFileSync(config.dest, newContent);
  console.log(`  -> Wrote to ${config.dest}`);

  if (missingKeys.length > 0) {
    console.warn(`  ! Missing keys in source ${sourceEnvFile}: ${missingKeys.join(', ')}`);
  }
}

function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  console.log(`Reading source environment variables from: ${sourcePath}`);
  const sourceContent = fs.readFileSync(sourcePath, 'utf8');
  const sourceEnv = parseEnv(sourceContent);

  for (const [name, config] of Object.entries(SERVICES)) {
    processService(name, config, sourceEnv);
  }

  console.log('\nDone.');
}

main();
