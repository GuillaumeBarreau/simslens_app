import { useMemo } from 'react';

import StatsCard from '../components/StatsCard';
import { useStats } from '../hooks/useStats';

export default function Dashboard() {
  const { stats, loading, error } = useStats();

  const classCounts = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byClass)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [stats]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="mb-4 animate-spin text-4xl">⚙️</div>
          <p>Chargement des données…</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex h-full items-center justify-center text-red-400">
        <div className="text-center">
          <p className="mb-2 text-xl">❌ Erreur de connexion</p>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="mt-2 text-xs text-gray-600">Le serveur est-il démarré sur le port 5000 ?</p>
        </div>
      </div>
    );
  }

  const max = classCounts[0]?.[1] ?? 1;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">Vue d'ensemble du serveur</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Général
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard label="Guildes" value={stats.totalRealms} icon="🏰" color="yellow" />
          <StatsCard label="Personnages actifs" value={stats.active} icon="🧙" color="green" />
          <StatsCard label="En attente" value={stats.pending} icon="⏳" color="blue" />
          <StatsCard label="Archivés" value={stats.archived} icon="📦" color="red" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Composition (actifs)
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard label="Tanks" value={stats.byRole['tank'] ?? 0} icon="🛡️" color="yellow" />
          <StatsCard label="Healers" value={stats.byRole['healer'] ?? 0} icon="💚" color="green" />
          <StatsCard label="DPS" value={stats.byRole['dps'] ?? 0} icon="⚔️" color="red" />
          <StatsCard label="iLvl moyen" value={stats.avgIlvl} icon="📈" color="purple" />
        </div>
      </section>

      {classCounts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Répartition par classe
          </h2>
          <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-900 p-4">
            {classCounts.map(([cls, count]) => (
              <div key={cls} className="flex items-center gap-3">
                <span className="w-32 truncate text-sm text-gray-300">{cls}</span>
                <div className="h-2 flex-1 rounded-full bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-yellow-500"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-sm text-gray-400">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
