import { useQuery } from '@tanstack/react-query';

import { blizzardService } from 'services/blizzard.service';

export function useBlizzardCharacters(options?: any) {
  return useQuery({
    queryKey: ['blizzard', 'characters'],
    queryFn: blizzardService.getCharacters,
    retry: false,
    ...options,
  });
}
