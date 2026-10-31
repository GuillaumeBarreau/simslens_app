const instanceBossService = require('./instance_boss_killed.service');

async function getInstanceBosses(req, res, next) {
  try {
    const { instanceId } = req.params;
    const bosses = await instanceBossService.getInstanceBosses(parseInt(instanceId));
    res.json(bosses);
  } catch (err) {
    next(err);
  }
}

async function getBossStatus(req, res, next) {
  try {
    const { instanceId, bossId } = req.params;
    const status = await instanceBossService.getBossStatus(parseInt(instanceId), parseInt(bossId));
    if (!status) {
      return res.status(404).json({ error: 'Boss not found for this instance' });
    }
    res.json(status);
  } catch (err) {
    next(err);
  }
}

/**
 * La notification Discord qui suivait (salon public + message privé avec boutons de
 * vote, envoyé à tous les personnages ayant un tag Discord, toutes guildes
 * confondues) a été retirée avec le vote applicatif : le vote se fait dans l'addon
 * en jeu (SIMS-149).
 */
async function killBoss(req, res, next) {
  try {
    const { instanceId, bossId } = req.params;
    const boss = await instanceBossService.killBoss(parseInt(instanceId), parseInt(bossId));
    res.json(boss);
  } catch (err) {
    next(err);
  }
}

async function resurrectBoss(req, res, next) {
  try {
    const { instanceId, bossId } = req.params;
    const boss = await instanceBossService.resurrectBoss(parseInt(instanceId), parseInt(bossId));
    res.json(boss);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInstanceBosses,
  getBossStatus,
  killBoss,
  resurrectBoss,
};
