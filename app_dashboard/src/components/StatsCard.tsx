interface StatsCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: 'yellow' | 'blue' | 'green' | 'red' | 'purple';
}

const colorMap: Record<string, string> = {
  yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  green: 'text-green-400 bg-green-500/10 border-green-500/20',
  red: 'text-red-400 bg-red-500/10 border-red-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export default function StatsCard({ label, value, icon, color = 'yellow' }: StatsCardProps) {
  return (
    <div className={`flex items-center gap-4 rounded-lg border p-4 ${colorMap[color]}`}>
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="mt-0.5 text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}
