/**
 * Priorité d'un vœu, miroir de `server/src/shared/constants/wishlistPriority.js`.
 *
 * L'échelle de priorité de SIMS-205 a été retirée de l'interface (SIMS-250) :
 * l'objet choisi pour un emplacement est le BiS de cet emplacement, et le front
 * envoie toujours `0`. Le serveur ignore encore les anciennes lignes à `5`
 * (« je n'en veux pas ») ; le front fait de même pour rester aligné.
 */
const NOT_WANTED = 5;

export function isWantedPriority(priority: number | null | undefined): boolean {
  return priority !== NOT_WANTED;
}
