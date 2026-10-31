import type { Prisma } from '@prisma/client';

import type { EventSeriesEntity } from './event.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const eventSeriesRepository: {
  create(data: Prisma.raid_event_seriesUncheckedCreateInput): Promise<EventSeriesEntity>;
  findById(id: number): Promise<EventSeriesEntity | null>;
  update(
    id: number,
    data: Prisma.raid_event_seriesUncheckedUpdateInput,
  ): Promise<EventSeriesEntity>;
  findActive(): Promise<EventSeriesEntity[]>;
  findUpcomingOccurrences(
    seriesId: number,
    fromDate: Date,
    now: Date,
  ): Promise<Array<{ id: number; seriesOccurrenceDate: Date | null }>>;
};

export default eventSeriesRepository;
