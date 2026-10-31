import { Stack } from '@mantine/core';
import { ActivityLog } from 'services/history.service';

import { EventSignupEntry } from './EventSignupEntry';
import { SimReportEntry } from './SimReportEntry';
import { WishlistEntry } from './WishlistEntry';

interface LogEntryProps {
  log: ActivityLog;
}

function LogEntry({ log }: LogEntryProps) {
  if (log.actionType === 'WISHLIST_UPDATE') return <WishlistEntry log={log} />;
  if (log.actionType === 'SIM_REPORT_UPLOAD') return <SimReportEntry log={log} />;
  if (log.actionType === 'EVENT_SIGNUP') return <EventSignupEntry log={log} />;
  return null;
}

interface HistoryFeedProps {
  logs: ActivityLog[];
}

export function HistoryFeed({ logs }: HistoryFeedProps) {
  return (
    <Stack gap={0}>
      {logs.map((log) => (
        <LogEntry key={log.id} log={log} />
      ))}
    </Stack>
  );
}
