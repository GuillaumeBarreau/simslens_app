import { apiClient } from './api.client';
import { blizzardService } from './blizzard.service';
import { lootService } from './loot.service';
import { raidService } from './raid.service';
import { realmService } from './realm.service';

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const fetchLoots = async (ids: Array<number | string>) => {
  if (!ids.length) return [];
  return Promise.all(ids.map((id) => lootService.getOne(id)));
};

export const fetchItem = raidService.getItem;
export const fetchItems = async (ids: Array<number | string>) => {
  if (!ids.length) return [];
  return Promise.all(ids.map((id) => raidService.getItem(id)));
};
export const fetchBosses = raidService.getAllBosses;
export const fetchRaids = raidService.getAllRaids;
export const createInstance = raidService.createInstance;

export const createLoot = lootService.create;
export const fetchLoot = lootService.getOne;
export const assignLoot = lootService.assign;
export const removeLoot = lootService.remove;

export const checkUserRealm = realmService.checkUserRealm;
export const createRealm = realmService.create;
export const fetchMyPermissions = realmService.getMyPermissions;

export const claimBnetCharacter = blizzardService.claimCharacter;
export const fetchGuildRoster = blizzardService.getGuildRoster;
export const importGuildMembers = blizzardService.importGuildMembers;

export default apiClient;
