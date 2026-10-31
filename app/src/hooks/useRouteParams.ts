import {
  CURRENT_SEASON,
  WOW_EXTENSION,
  EXTENSION_SEASONS,
  getDefaultSeasonForExtension,
} from 'config/seasonConfig';
import { useParams } from 'react-router-dom';

export const STORAGE_KEY_EXTENSION = 'wow_selected_extension';
export const STORAGE_KEY_SEASON = 'wow_selected_season';

export const useRouteParams = () => {
  const params = useParams();
  const isDev = import.meta.env.DEV;

  const extension =
    params.extension ||
    (isDev ? localStorage.getItem(STORAGE_KEY_EXTENSION) : null) ||
    WOW_EXTENSION;

  const rawSeason =
    params.season || (isDev ? localStorage.getItem(STORAGE_KEY_SEASON) : null) || CURRENT_SEASON;

  const validSeasons = EXTENSION_SEASONS[extension] || [];
  const season = validSeasons.includes(rawSeason)
    ? rawSeason
    : getDefaultSeasonForExtension(extension);

  return {
    extension,
    guild: params.guild,
    season,
  };
};
