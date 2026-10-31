import type { SelectedNodes, TalentNode } from 'types/talent.types';

import {
  buildPrerequisites,
  iconUrl,
  isNodeAvailable,
  layoutNodes,
  NODE_SIZE,
  nodeLabel,
} from './talentLayout';

interface TalentTreePanelProps {
  title?: string;
  nodes: TalentNode[];
  selected: SelectedNodes;
  readOnly?: boolean;
  /** Facteur d'échelle d'affichage (1 = taille native). */
  scale?: number;
  onNodeClick: (node: TalentNode) => void;
}

const GOLD = '#e6b34d';

// Forme du nœud : octogone pour un choix, cercle pour un passif "rond", carré arrondi sinon.
const OCTAGON = 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';

export function TalentTreePanel({
  title,
  nodes,
  selected,
  readOnly = false,
  scale = 1,
  onNodeClick,
}: TalentTreePanelProps) {
  const { nodes: positioned, edges, width, height } = layoutNodes(nodes);
  const prereqs = buildPrerequisites(nodes);

  if (positioned.length === 0) return null;

  const size = NODE_SIZE * scale;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {title && (
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mantine-color-gray-4)' }}>
          {title}
        </div>
      )}

      <div style={{ position: 'relative', width: width * scale, height: height * scale }}>
        {/* Arêtes (fond) */}
        <svg
          width={width * scale}
          height={height * scale}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          {edges.map((edge) => {
            const active = (selected[edge.fromId]?.rank ?? 0) > 0;
            return (
              <line
                key={`${edge.fromId}-${edge.toId}`}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                stroke={active ? GOLD : 'var(--mantine-color-dark-2)'}
                strokeWidth={active ? 2.5 : 1.5}
              />
            );
          })}
        </svg>

        {/* Nœuds (HTML positionné) */}
        {positioned.map(({ node, x, y }) => {
          const current = selected[node.blizzardNodeId];
          const rank = current?.rank ?? 0;
          const isSelected = rank > 0;
          const isChoice = node.entries.length > 1;

          // Nœud structurel sans talent : petit marqueur d'ancrage discret.
          if (node.entries.length === 0) {
            return (
              <div
                key={node.blizzardNodeId}
                style={{
                  position: 'absolute',
                  left: (x - 4) * scale,
                  top: (y - 4) * scale,
                  width: 8 * scale,
                  height: 8 * scale,
                  borderRadius: '50%',
                  background: 'var(--mantine-color-dark-4)',
                }}
              />
            );
          }

          const available = isNodeAvailable(node, prereqs, selected);
          const label = nodeLabel(node, current);
          const entry = isChoice
            ? (node.entries[current?.choiceIndex ?? 0] ?? node.entries[0])
            : node.entries[0];
          const url = iconUrl(entry?.icon);

          const clip = isChoice ? OCTAGON : undefined;
          const radius = isChoice ? undefined : node.nodeType === 'HERO' ? '50%' : 8 * scale;
          const borderW = isSelected ? 2 : 1;
          const borderColor = isSelected ? GOLD : 'rgba(0,0,0,0.6)';
          const iconFilter = isSelected
            ? 'none'
            : available
              ? 'grayscale(1)'
              : 'grayscale(1) brightness(0.55)';
          const tooltip = isChoice
            ? `${label} — choix : ${node.entries.map((e) => e.name).join(' / ')}`
            : `${label}${node.maxRank > 1 ? ` (${rank}/${node.maxRank})` : ''}`;

          return (
            <div
              key={node.blizzardNodeId}
              title={tooltip}
              onClick={() => !readOnly && onNodeClick(node)}
              style={{
                position: 'absolute',
                left: (x - NODE_SIZE / 2) * scale,
                top: (y - NODE_SIZE / 2) * scale,
                width: size,
                height: size,
                cursor: readOnly ? 'default' : 'pointer',
                // Le halo suit la forme découpée (drop-shadow, pas box-shadow).
                filter: isSelected ? `drop-shadow(0 0 4px ${GOLD})` : 'none',
              }}
            >
              {/* Couche cadre (= bordure) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  clipPath: clip,
                  borderRadius: radius,
                  background: borderColor,
                }}
              />
              {/* Couche icône, en retrait de l'épaisseur de bordure */}
              <div
                style={{
                  position: 'absolute',
                  inset: borderW,
                  clipPath: clip,
                  borderRadius: radius,
                  overflow: 'hidden',
                  background: 'var(--mantine-color-dark-7)',
                }}
              >
                {url && (
                  <img
                    src={url}
                    alt={label}
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      filter: iconFilter,
                    }}
                  />
                )}
              </div>

              {node.maxRank > 1 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: 0,
                    left: 0,
                    textAlign: 'center',
                    fontSize: Math.max(9, 10 * scale),
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: '#fff',
                    textShadow: '0 1px 2px #000, 0 0 3px #000',
                  }}
                >
                  {rank}/{node.maxRank}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
