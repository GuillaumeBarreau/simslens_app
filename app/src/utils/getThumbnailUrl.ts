interface ThumbnailData {
  thumbnail?: string | null;
  region?: string | null;
}

export function getThumbnailUrl(data: ThumbnailData): string | null {
  if (!data.thumbnail) return null;
  const region = (data.region || 'eu').toLowerCase();
  return `https://render-${region}.worldofwarcraft.com/character/${data.thumbnail}`;
}
