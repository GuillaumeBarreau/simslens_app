# Forms & Validation

Forms use `@mantine/form` for state and validation, Axios services for API calls, and `@tanstack/react-query` for server state management.

## Stack

- **`@mantine/form`** — form state, validation, field binding
- **`@tanstack/react-query`** — `useMutation` / `useQuery` + cache invalidation
- **Axios** — HTTP client via `apiClient` (`src/services/api.client.ts`)
- **`@mantine/notifications`** — feedback toast après soumission
- **Zod** — définition des types de données (pas de validation de form)

---

## Basic Pattern

Un formulaire typique combine `useForm` (Mantine) + `useMutation` (React Query) :

```tsx
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useCreateAbsence } from 'hooks/queries';

function AbsenceForm({ onClose }: { onClose: () => void }) {
  const createAbsence = useCreateAbsence();

  const form = useForm({
    initialValues: {
      reason: '',
      startDate: null as Date | null,
    },
    validate: {
      startDate: (value) => (!value ? 'Date requise' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await createAbsence.mutateAsync({
        realmId,
        startDate: values.startDate!.toISOString(),
        reason: values.reason || undefined,
      });
      notifications.show({ title: 'Succès', message: 'Absence enregistrée', color: 'green' });
      form.reset();
      onClose();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error?.response?.data?.message || error?.message,
        color: 'red',
      });
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Textarea label="Raison" {...form.getInputProps('reason')} />
      <Button type="submit" loading={createAbsence.isPending}>
        Enregistrer
      </Button>
    </form>
  );
}
```

---

## Service Layer

Les appels API passent par des classes de service qui utilisent `apiClient` :

```ts
// src/services/absence.service.ts
class AbsenceService {
  async create(payload: CreateAbsencePayload): Promise<Absence> {
    const { data } = await apiClient.post('/1/absences', payload);
    return data.absence;
  }

  async update(id: number, realmId: number, payload: UpdateAbsencePayload): Promise<Absence> {
    const { data } = await apiClient.put(`/1/absences/${id}?realmId=${realmId}`, payload);
    return data.absence;
  }

  async remove(id: number, realmId: number): Promise<void> {
    await apiClient.delete(`/1/absences/${id}?realmId=${realmId}`);
  }
}

export const absenceService = new AbsenceService();
```

Le royaume passe dans l'URL de la route (`/realms/:realmId/...`) : `apiClient` n'ajoute aucun header de royaume.

---

## Query Hooks

Tous les hooks sont dans `src/hooks/queries/`. Le pattern est uniforme :

```ts
// src/hooks/queries/useAbsenceQueries.ts
export function useAbsences(filters: AbsenceFilters) {
  return useQuery({
    queryKey: ['absences', filters],
    queryFn: () => absenceService.getAll(filters),
    enabled: !!filters.realmId,
  });
}

export function useCreateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAbsencePayload) => absenceService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
```

---

## Validation

La validation se déclare dans `useForm` via l'option `validate`. Chaque champ retourne une string d'erreur ou `null` :

```ts
const form = useForm({
  initialValues: { dates: [null, null] as [Date | null, Date | null] },
  validate: {
    dates: (value) => {
      if (!value[0]) return 'Date de début requise';
      if (!value[1]) return 'Date de fin requise';
      return null;
    },
  },
});
```

Les erreurs s'affichent automatiquement via `{...form.getInputProps('fieldName')}` sur les inputs Mantine.

---

## Loading States

Utiliser `isPending` de la mutation sur les boutons :

```tsx
<Button type="submit" loading={mutation.isPending}>
  {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
</Button>
```

Pour désactiver tous les champs pendant la soumission :

```tsx
<TextInput disabled={mutation.isPending} {...form.getInputProps('name')} />
```

---

## Error Handling

Les erreurs sont affichées via `@mantine/notifications` dans le `catch` du handler :

```tsx
} catch (error: any) {
  notifications.show({
    title: 'Erreur',
    message: error?.response?.data?.message || error?.message || 'Erreur inconnue',
    color: 'red',
  });
}
```

Ne pas afficher les erreurs directement dans le DOM — toujours passer par les notifications Mantine.

---

## Post-Submission

Le formulaire appelle `onClose()` et `form.reset()` après succès. La navigation ou le rechargement de données est géré par l'invalidation des queries dans le hook (`onSuccess`), pas dans le formulaire lui-même.

```tsx
// onSuccess dans le mutation hook invalide le cache
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['absences'] });
}

// Le composant ferme juste la modal
notifications.show({ ... });
form.reset();
onClose();
```

---

## Zod

Zod est utilisé pour définir les **types de données** (entités DB), pas pour valider les formulaires :

```ts
// src/types/shared.ts
export const CharactersSchema = z.object({
  id: z.number(),
  name: z.string(),
  class: z.string(),
  archived: z.number().nullable(),
});

export type Characters = z.infer<typeof CharactersSchema>;
```

---

## Exemples de référence

| Composant                                                                                  | Description                                     |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| [AbsenceModal.tsx](../../app/src/pages/CalendarPage/components/AbsenceModal.tsx)           | Form create/edit avec date picker et validation |
| [EventModal.tsx](../../app/src/pages/CalendarPage/components/EventModal.tsx)               | Modal complexe avec plusieurs mutations         |
| [AvailabilityModal.tsx](../../app/src/pages/DungeonsPage/components/AvailabilityModal.tsx) | Sélecteurs de rôle et créneaux horaires         |
| [CreateRealmPage.tsx](../../app/src/pages/CreateRealmPage/CreateRealmPage.tsx)             | Selects en cascade région → serveur             |
