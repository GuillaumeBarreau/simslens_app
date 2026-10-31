const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { processReport, processQEReport } = require('../workers/reportWorker');

const QUEUE_NAME = 'report-processing';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6380', 10);
const concurrency = parseInt(process.env.REPORT_QUEUE_CONCURRENCY || '3', 10);

function createBullConnection() {
  return new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
  });
}

const queueConnection = createBullConnection();
const workerConnection = createBullConnection();

const reportQueue = new Queue(QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 200 },
    removeOnFail: { age: 24 * 3600, count: 500 },
  },
});

let reportWorker = null;

function startReportWorker() {
  if (reportWorker) return reportWorker;

  reportWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { reportID, source } = job.data;
      console.log(
        `[ReportQueue] Picking up job ${job.id} (reportID=${reportID}, source=${source}, attempt=${job.attemptsMade + 1})`,
      );
      if (source === 'qe') {
        await processQEReport(reportID);
      } else {
        await processReport(reportID);
      }
      return { reportID };
    },
    {
      connection: workerConnection,
      concurrency,
    },
  );

  reportWorker.on('completed', (job) => {
    console.log(`[ReportQueue] Job ${job.id} completed (reportID=${job.data.reportID})`);
  });

  reportWorker.on('failed', (job, err) => {
    console.error(
      `[ReportQueue] Job ${job?.id} failed (reportID=${job?.data?.reportID}): ${err.message}`,
    );
  });

  reportWorker.on('error', (err) => {
    console.error('[ReportQueue] Worker error:', err.message);
  });

  console.log(
    `[ReportQueue] Worker started on "${QUEUE_NAME}" (concurrency=${concurrency}, redis=${redisHost}:${redisPort})`,
  );

  return reportWorker;
}

async function enqueueReport(reportID, source = 'raidbots') {
  const jobId = `${source}-${reportID}`;

  const existing = await reportQueue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'completed' || state === 'failed') {
      await existing.remove();
    }
  }

  return reportQueue.add('process-report', { reportID, source }, { jobId });
}

async function getQueueStats() {
  const counts = await reportQueue.getJobCounts(
    'waiting',
    'active',
    'delayed',
    'completed',
    'failed',
  );
  return { name: QUEUE_NAME, concurrency, ...counts };
}

async function closeReportQueue() {
  try {
    if (reportWorker) {
      console.log('[ReportQueue] Closing worker...');
      await reportWorker.close();
    }
    console.log('[ReportQueue] Closing queue...');
    await reportQueue.close();
    await queueConnection.quit().catch(() => {});
    await workerConnection.quit().catch(() => {});
    console.log('[ReportQueue] Closed');
  } catch (err) {
    console.error('[ReportQueue] Error during close:', err.message);
  }
}

module.exports = {
  reportQueue,
  startReportWorker,
  enqueueReport,
  getQueueStats,
  closeReportQueue,
  QUEUE_NAME,
};
