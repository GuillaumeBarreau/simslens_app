import { useQuery } from '@tanstack/react-query';
import { ActivityLog, historyService } from 'services/history.service';

import { FilterType } from '../types';

interface UseHistoryLogsResult {
  logs: ActivityLog[] | undefined;
  filteredLogs: ActivityLog[] | undefined;
  isLoading: boolean;
}

export function useHistoryLogs(
  realmId: number | null,
  filter: FilterType,
  characterName: string | null,
): UseHistoryLogsResult {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['history', realmId, characterName],
    queryFn: () => historyService.getLogs(realmId!, 200, characterName ?? undefined),
    enabled: !!realmId,
    refetchOnMount: 'always',
  });

  const filteredLogs =
    !logs || filter === 'all' ? logs : logs.filter((l) => l.actionType === filter);

  return { logs, filteredLogs, isLoading };
}
