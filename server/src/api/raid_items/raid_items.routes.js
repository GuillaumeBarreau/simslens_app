const express = require('express');
const router = express.Router();
const { findItemsBySlot } = require('./raid_items.repository');

/**
 * Query params:
 *   difficulty - ignored (ilvl is computed client-side)
 *   classId    - optional WoW class ID to filter class-restricted items
 */
router.get('/:extension/seasons/:season/items/:slot', async (req, res, next) => {
  try {
    const { extension, season, slot } = req.params;
    const classId = req.query.classId ? parseInt(req.query.classId, 10) : null;

    const items = await findItemsBySlot(extension, season, slot, classId);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
