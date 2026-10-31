import { useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

import type { RealmWithCount } from '../hooks/useRealms';
import { useRealms } from '../hooks/useRealms';
import { adminFetch } from '../lib/api';
import type { Character, Subscription } from '../types';

const WOW_CLASS_COLORS: Record<string, string> = {
  'Death Knight': 'text-red-400',
  'Demon Hunter': 'text-purple-400',
  Druid: 'text-orange-400',
  Evoker: 'text-teal-400',
  Hunter: 'text-lime-400',
  Mage: 'text-sky-300',
  Monk: 'text-emerald-400',
  Paladin: 'text-pink-300',
  Priest: 'text-gray-100',
  Rogue: 'text-yellow-300',
  Shaman: 'text-blue-400',
  Warlock: 'text-violet-400',
  Warrior: 'text-yellow-600',
};

const ROLE_ICON: Record<string, string> = {
  tank: '🛡️',
  healer: '💚',
  dps: '⚔️',
};

const STATUS_BADGE: Record<string, string> = {
  approved: 'bg-green-500/10 text-green-400 border border-green-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
};

const TIER_BADGE: Record<number, string> = {
  1: 'bg-gray-500/10 text-gray-400 border border-gray-700',
  2: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  3: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  4: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  5: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
};

function useRealmCharacters(realmId: number, enabled: boolean) {
  const { getToken } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    getToken()
      .then((token) => {
        if (!token) throw new Error('No token');
        return adminFetch<Character[]>(`/realms/${realmId}/characters`, token);
      })
      .then((data) => {
        setCharacters(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [realmId, enabled, getToken]);

  return { characters, loading };
}

export default function Guilds() {
  const { realms, loading, error, refetch } = useRealms();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="mb-4 animate-spin text-4xl">⚙️</div>
          <p>Chargement des guildes…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-400">
        <p>❌ {error}</p>
      </div>
    );
  }

  const q = search.toLowerCase();
  const filteredRealms = realms.filter(
    (r) =>
      !q ||
      r.guildName.toLowerCase().includes(q) ||
      r.server.toLowerCase().includes(q) ||
      r.region.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Guildes</h1>
        <p className="mt-1 text-sm text-gray-400">
          {filteredRealms.length} guilde(s) · {realms.reduce((s, r) => s + r._count.characters, 0)}{' '}
          personnages au total
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher une guilde…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-48 flex-1 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:border-yellow-500 focus:outline-none"
        />
        <div className="flex gap-1 rounded-md border border-gray-700 bg-gray-800 p-1">
          {(['all', 'approved', 'pending'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={[
                'rounded px-3 py-1 text-xs font-medium transition-colors',
                filterStatus === s
                  ? 'bg-yellow-500 text-black'
                  : 'text-gray-400 hover:text-gray-200',
              ].join(' ')}
            >
              {s === 'all' ? 'Tous' : s === 'approved' ? 'Actifs' : 'En attente'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredRealms.map((realm) => (
          <GuildCard
            key={realm.id}
            realm={realm}
            isOpen={expandedId === realm.id}
            filterStatus={filterStatus}
            onToggle={() => setExpandedId(expandedId === realm.id ? null : realm.id)}
            onSubscriptionCreated={refetch}
          />
        ))}

        {filteredRealms.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <p className="mb-2 text-4xl">🔍</p>
            <p>Aucun résultat trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface GuildCardProps {
  realm: RealmWithCount;
  isOpen: boolean;
  filterStatus: 'all' | 'approved' | 'pending';
  onToggle: () => void;
  onSubscriptionCreated: () => void;
}

function GuildCard({
  realm,
  isOpen,
  filterStatus,
  onToggle,
  onSubscriptionCreated,
}: GuildCardProps) {
  const { getToken } = useAuth();
  const { characters, loading } = useRealmCharacters(realm.id, isOpen);
  const [showSubForm, setShowSubForm] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [subForm, setSubForm] = useState({
    tier: '2',
    type: 'monthly',
    price: '',
    expiresAt: '',
    note: '',
  });

  const activeSub: Subscription | undefined = realm.subscriptions?.[0];
  const isExpired = activeSub && new Date(activeSub.expiresAt) < new Date();

  const filtered = characters.filter((c) => {
    if (filterStatus === 'approved') return !c.archived && c.status === 'approved';
    if (filterStatus === 'pending') return c.status === 'pending';
    return true;
  });

  const active = characters.filter((c) => !c.archived && c.status === 'approved').length;
  const pending = characters.filter((c) => c.status === 'pending').length;
  const archived = characters.filter((c) => c.archived).length;

  async function handleCreateSub(e: React.FormEvent) {
    e.preventDefault();
    setSubLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No token');
      await adminFetch(`/realms/${realm.id}/subscriptions`, token, {
        method: 'POST',
        body: JSON.stringify({
          tier: Number(subForm.tier),
          type: subForm.type,
          price: Number(subForm.price),
          expiresAt: subForm.expiresAt,
          note: subForm.note || undefined,
        }),
      });
      setShowSubForm(false);
      onSubscriptionCreated();
    } catch {
      alert("Erreur lors de la création de l'abonnement");
    } finally {
      setSubLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-800/50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-xl">🏰</span>
          <div className="min-w-0 text-left">
            <p className="truncate font-semibold text-white">{realm.guildName}</p>
            <p className="text-xs text-gray-500">
              {realm.server} · {realm.region}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${TIER_BADGE[realm.tier] ?? TIER_BADGE[1]}`}
          >
            Palier {realm.tier}
          </span>

          {activeSub && !isExpired ? (
            <span className="rounded border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
              Abonnement · exp. {formatDate(activeSub.expiresAt)}
            </span>
          ) : activeSub && isExpired ? (
            <span className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
              Expiré le {formatDate(activeSub.expiresAt)}
            </span>
          ) : null}

          {isOpen ? (
            <div className="flex gap-2 text-xs">
              {active > 0 && (
                <span className="rounded border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-green-400">
                  {active} actifs
                </span>
              )}
              {pending > 0 && (
                <span className="rounded border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-yellow-400">
                  {pending} en attente
                </span>
              )}
              {archived > 0 && (
                <span className="rounded border border-gray-700 bg-gray-500/10 px-2 py-0.5 text-gray-500">
                  {archived} archivés
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-500">{realm._count.characters} personnages</span>
          )}
          <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-800">
          <div className="border-b border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Abonnement
              </p>
              <button
                type="button"
                onClick={() => setShowSubForm((v) => !v)}
                className="rounded px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/10"
              >
                {showSubForm ? 'Annuler' : '+ Nouvel abonnement'}
              </button>
            </div>

            {activeSub && !isExpired ? (
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-300">
                <span>
                  Palier <strong>{activeSub.tier}</strong>
                </span>
                <span>{activeSub.type === 'monthly' ? 'Mensuel' : 'Annuel'}</span>
                <span>{Number(activeSub.price).toFixed(2)} €</span>
                <span>
                  Du {formatDate(activeSub.startedAt)} au {formatDate(activeSub.expiresAt)}
                </span>
                {activeSub.note && <span className="italic text-gray-500">{activeSub.note}</span>}
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-600">Aucun abonnement actif</p>
            )}

            {showSubForm && (
              <form
                onSubmit={handleCreateSub}
                className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Palier</span>
                  <select
                    value={subForm.tier}
                    onChange={(e) => setSubForm((f) => ({ ...f, tier: e.target.value }))}
                    className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200"
                  >
                    {[1, 2, 3, 4, 5].map((t) => (
                      <option key={t} value={t}>
                        Palier {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Type</span>
                  <select
                    value={subForm.type}
                    onChange={(e) => setSubForm((f) => ({ ...f, type: e.target.value }))}
                    className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200"
                  >
                    <option value="monthly">Mensuel</option>
                    <option value="annual">Annuel</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Prix (€)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={subForm.price}
                    onChange={(e) => setSubForm((f) => ({ ...f, price: e.target.value }))}
                    className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200"
                    placeholder="9.99"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Expiration</span>
                  <input
                    type="date"
                    required
                    value={subForm.expiresAt}
                    onChange={(e) => setSubForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200"
                  />
                </label>
                <label className="col-span-2 flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs text-gray-400">Note (optionnel)</span>
                  <input
                    type="text"
                    value={subForm.note}
                    onChange={(e) => setSubForm((f) => ({ ...f, note: e.target.value }))}
                    className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200"
                    placeholder="Ex: paiement PayPal ref #123"
                  />
                </label>
                <div className="col-span-2 flex justify-end sm:col-span-3">
                  <button
                    type="submit"
                    disabled={subLoading}
                    className="rounded bg-yellow-500 px-4 py-1.5 text-xs font-medium text-black hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {subLoading ? 'Enregistrement…' : "Créer l'abonnement"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {loading ? (
            <div className="py-6 text-center text-sm text-gray-500">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">Aucun personnage</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800/50 text-xs uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-2 text-left">Personnage</th>
                  <th className="hidden px-4 py-2 text-left sm:table-cell">Spé</th>
                  <th className="hidden px-4 py-2 text-left md:table-cell">Rôle</th>
                  <th className="px-4 py-2 text-right">iLvl</th>
                  <th className="hidden px-4 py-2 text-right lg:table-cell">Score</th>
                  <th className="px-4 py-2 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((c) => (
                  <CharacterRow key={c.id} character={c} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function CharacterRow({ character: c }: { character: Character }) {
  const classColor = WOW_CLASS_COLORS[c.class] ?? 'text-gray-300';
  const role = c.specialization?.role ?? 'dps';
  const isArchived = !!c.archived;

  return (
    <tr className={`transition-colors hover:bg-gray-800/30 ${isArchived ? 'opacity-40' : ''}`}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          {c.thumbnail ? (
            <img
              src={c.thumbnail}
              alt={c.name}
              className="size-7 rounded-full border border-gray-700 bg-gray-800"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-xs text-gray-500">
              ?
            </div>
          )}
          <span className={`font-medium ${classColor}`}>{c.name}</span>
          {isArchived && <span className="text-xs text-gray-600">(archivé)</span>}
        </div>
      </td>
      <td className="hidden px-4 py-2.5 text-gray-400 sm:table-cell">
        {c.specialization?.name ?? c.spec ?? '—'}
      </td>
      <td className="hidden px-4 py-2.5 md:table-cell">
        <span title={role}>{ROLE_ICON[role] ?? '⚔️'}</span>
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-gray-300">{c.ilvl ?? '—'}</td>
      <td className="hidden px-4 py-2.5 text-right font-mono text-gray-400 lg:table-cell">
        {c.score ? c.score.toFixed(0) : '—'}
      </td>
      <td className="px-4 py-2.5 text-right">
        <span
          className={`rounded px-2 py-0.5 text-xs ${STATUS_BADGE[c.status] ?? 'text-gray-500'}`}
        >
          {c.status === 'approved' ? 'Actif' : 'En attente'}
        </span>
      </td>
    </tr>
  );
}
