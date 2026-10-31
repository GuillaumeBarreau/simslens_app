import type { NextFunction, Request, Response } from 'express';
const service = require('./bossKilled.service');
const instanceRepo = require('../instance/instance.repository');

async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const instanceId = parseInt(
      Array.isArray(req.params.instanceId) ? req.params.instanceId[0] : req.params.instanceId,
      10,
    );
    if (!instanceId) return res.status(400).json({ error: 'instanceId required' });

    const realmId = req.query.realmId ? parseInt(req.query.realmId as string, 10) : null;
    if (realmId) {
      const instance = await instanceRepo.findInstanceById(instanceId);
      if (!instance || instance.realmId !== realmId) {
        return res.status(403).json({ error: 'forbidden' });
      }
    }

    const rows = await service.listByInstance(instanceId);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function updateKill(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { killed } = req.body || {};
    if (typeof killed === 'undefined') return res.status(400).json({ error: 'killed required' });
    const result = await service.setKillState(id, !!killed);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export default {
  list,
  updateKill,
};
