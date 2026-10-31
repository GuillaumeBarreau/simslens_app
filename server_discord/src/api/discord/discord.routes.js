import express from 'express';

import * as controller from './discord.controller.js';
import * as raidController from './raid.controller.js';

const router = express.Router();

router.post('/message', controller.sendMessage);
router.get('/status', controller.status);
router.get('/members', controller.members);

router.post('/events', controller.createEvent);
router.put('/events/:id', controller.updateEvent);
router.delete('/events/:id', controller.deleteEvent);
router.post('/announce', controller.postAnnouncement);

router.post('/raid/channel', raidController.createRaidChannel);
router.delete('/raid/channel/:channelId', raidController.deleteRaidChannel);
router.put('/raid/roster', raidController.updateRosterMessage);
router.put('/raid/ping-no-responders', raidController.pingNoRespondersEndpoint);
router.put('/raid/confirm-reminder', raidController.confirmReminderEndpoint);

export default router;
