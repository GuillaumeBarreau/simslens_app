const express = require('express');
const Joi = require('joi');
const router = express.Router();
const redis = require('./shared/redis');
const { enqueueReport, getQueueStats } = require('./queues/reportQueue');
const requireUserOrInternal = require('./middleware/requireUserOrInternal');
const { validateParams, validateQuery } = require('./shared/middleware/validate');

// Import des rapports Droptimizer (Raidbots / QuestionablyEpic). Appelé par la page
// Tracking (session) et par le bot Discord (x-internal-token) : requireUserOrInternal.
// reportID est interpolé dans l'URL que le worker appelle : il est validé ici. SIMS-151.

const reportIdParam = Joi.object({
  reportID: Joi.string()
    .pattern(/^[A-Za-z0-9_-]{8,64}$/)
    .required()
    .messages({ 'string.pattern.base': 'Invalid report ID', 'any.required': 'Invalid report ID' }),
});

const reportSourceQuery = Joi.object({
  source: Joi.string().valid('raidbots', 'qe').default('raidbots'),
});

router.get(
  '/report/:reportID',
  requireUserOrInternal,
  validateParams(reportIdParam),
  validateQuery(reportSourceQuery),
  async (req, res) => {
    const { reportID } = req.params;
    const { source } = req.query;
    res.set('Cache-Control', 'no-store');

    const initialStatus = {
      status: 'processing',
      startTime: new Date().toISOString(),
      message: 'Queued for processing...',
      progress: '0%',
    };

    try {
      await redis.set(`report:status:${reportID}`, JSON.stringify(initialStatus), 'EX', 3600);
      const job = await enqueueReport(reportID, source);
      res.json({
        message: `Queued report ${reportID} for processing`,
        jobId: job.id,
      });
    } catch (err) {
      console.error(`Failed to enqueue report ${reportID}:`, err);
      res.status(500).json({ error: 'Failed to enqueue report for processing' });
    }
  },
);

router.get('/report/queue/stats', requireUserOrInternal, async (_req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (err) {
    console.error('Failed to read report queue stats:', err);
    res.status(500).json({ error: 'Failed to read report queue stats' });
  }
});

router.get(
  '/report/status/:reportID',
  requireUserOrInternal,
  validateParams(reportIdParam),
  async (req, res) => {
    const { reportID } = req.params;
    try {
      const statusData = await redis.get(`report:status:${reportID}`);
      if (statusData) {
        res.json(JSON.parse(statusData));
      } else {
        res.json({
          status: 'unknown',
          message: `No active processing found for report ${reportID}`,
        });
      }
    } catch (err) {
      console.error('Redis error getting status:', err);
      res.status(500).json({ error: 'Internal Server Error refreshing status' });
    }
  },
);

module.exports = router;
module.exports.reportIdParam = reportIdParam;
module.exports.reportSourceQuery = reportSourceQuery;
