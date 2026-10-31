# Chargement des données (frontend)

Règles d'appel à l'API dans `app/`. Elles s'appliquent à tout nouveau code ; le code
existant qui ne les respecte pas encore est de la dette, pas un modèle.

> Reprend et remplace l'ancien `GEMINI_RULES.md` (chapitre 7), vérifié contre le code
> le 2026-10-07.

## Les couches

```
Composant  →  hook  (app/src/hooks/queries/use<Domaine>Queries.ts)
           →  service (app/src/services/<domaine>.service.ts)
           →  apiClient (app/src/services/api.client.ts)
```

| Couche      | Rôle                                                                     | Interdit                                   |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| Composant   | Appelle un hook `useQuery` / `useMutation`, affiche les états.           | `fetch`, `axios`, `apiClient`, un service. |
| Hook        | Clé de requête, `staleTime`, invalidation après mutation.                | Appel HTTP direct.                         |
| Service     | Un objet par domaine (`raidService`, …), une méthode par route.          | Logique d'affichage, état React.           |
| `apiClient` | Instance Axios unique : base URL, cookies de session, gestion d'erreurs. | Être contourné.                            |

## Règles

1. **Pas de `useEffect` pour charger des données.** On passe par **TanStack Query**
   (`useQuery`, `useMutation`). Un `useEffect` reste légitime pour synchroniser autre
   chose (URL, invalidation au montage, abonnement), pas pour aller chercher une donnée.
2. **Tout appel passe par `apiClient`.** Il porte la session (`withCredentials`) et
   mémorise la page sur un `401`. Un `fetch` ou un `axios` direct perd tout cela.
3. **Clés de requête structurées**, du général au particulier :
   `['absences', id, realmId]`. Une mutation invalide la clé **parente**
   (`queryClient.invalidateQueries({ queryKey: ['absences'] })`), plus les domaines
   qu'elle impacte (ex. `['events']` après une absence).
4. **`staleTime`** : 5 minutes par défaut, réglé une fois dans `app/src/index.tsx`
   (`retry: 1`, pas de refetch au focus). À surcharger dans le hook seulement si la
   donnée vit à un autre rythme (60 s pour l'activité, `Infinity` pour les données de
   référence comme les enchantements).
5. **Chargement** : `Skeleton` Mantine pendant `isLoading`, à la même hauteur que le
   contenu final pour éviter les sauts de mise en page.
6. **Erreurs** : le `401` est géré par `apiClient` (mémorise la page pour y revenir
   après connexion). Le `403` n'a **pas** de traitement central aujourd'hui : afficher
   une notification Mantine dans le hook ou le composant concerné.

Pour les formulaires (`@mantine/form` + `useMutation` + notifications), voir
[`forms.md`](forms.md).
