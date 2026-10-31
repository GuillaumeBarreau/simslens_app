const schedule = require('node-schedule');
const { updateAllCharacters } = require('../../api/character/usecases');
const { syncAllCharacterKeyRuns } = require('../../api/character/usecases/syncAllCharacterKeyRuns');

function scheduleCharacterUpdates() {
  setImmediate(async () => {
    console.log('[KeySync] Initial sync on startup');
    try {
      const res = await syncAllCharacterKeyRuns();
      console.log('[KeySync] Initial sync done', res);
    } catch (e) {
      console.error('[KeySync] Initial sync failed', e);
    }
  });

  schedule.scheduleJob('0 20 * * *', async () => {
    console.log('Scheduled update at 20:00');
    try {
      const res = await updateAllCharacters();
      console.log('Update result', res);
    } catch (e) {
      console.error('Scheduled update failed', e);
    }
  });

  schedule.scheduleJob('0 * * * *', async () => {
    console.log('[KeySync] Starting scheduled key sync');
    try {
      const res = await syncAllCharacterKeyRuns();
      console.log('[KeySync] Done', res);
    } catch (e) {
      console.error('[KeySync] Scheduled sync failed', e);
    }
  });
}

module.exports = { scheduleCharacterUpdates };
