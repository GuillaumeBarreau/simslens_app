export const resolveBackgroundInstancePath = (
  name: string | undefined,
  image_background: string | undefined,
) => {
  if (!name || !image_background) return '';
  const path = `src/${name}/instance/${image_background}.png`;
  return path.startsWith('/') ? path : `/${path}`;
};
