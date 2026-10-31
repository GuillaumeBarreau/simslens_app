export function getQualityColor(quality: number | string): string {
  const qualityId = typeof quality === 'string' ? parseInt(quality, 10) : quality;

  switch (qualityId) {
    case 0: // Poor
      return '#9d9d9d';
    case 1: // Common
      return '#ffffff';
    case 2: // Uncommon
      return '#1eff00';
    case 3: // Rare
      return '#0070dd';
    case 4: // Epic
      return '#a335ee';
    case 5: // Legendary
      return '#ff8000';
    case 6: // Artifact
      return '#e6cc80';
    case 7: // Heirloom
      return '#00ccff';
    case 8: // WoW Token
      return '#00ccff';
    default:
      return '#ffffff';
  }
}

export function getQualityColorHex(quality: number | string): string {
  return getQualityColor(quality);
}
