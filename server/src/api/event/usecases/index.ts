/**
 * Le reste du module suit encore le pattern historique (event.service.js) ;
 * les séries récurrentes (SIMS-200) et les classes jouables d'un événement
 * (SIMS-026) sont écrites en usecases.
 */

export { createEventSeries } from './createEventSeries';
export { deleteEventSeries } from './deleteEventSeries';
export { extendEventSeries } from './extendEventSeries';
export { generateSeriesOccurrences } from './generateSeriesOccurrences';
export { listEventPlayableClasses } from './listEventPlayableClasses';
export { updateEventSeries } from './updateEventSeries';
