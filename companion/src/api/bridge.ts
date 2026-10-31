import { invoke } from '@tauri-apps/api/core';

export interface WowAccount {
  name: string;
  savedVariablesPath: string;
  hasRcLootCouncil: boolean;
}

export interface WowInstall {
  installPath: string;
  accounts: WowAccount[];
}

export interface AppSettings {
  serverUrl: string;
  appUrl: string;
  wowInstallPath: string | null;
  selectedAccount: string | null;
}

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  expiresIn: number;
  interval: number;
}

export interface TokenStatus {
  hasToken: boolean;
  expiresAt: string | null;
  scopes: string[];
}

export interface SyncState {
  lastSyncedAt: string | null;
  lastAttemptAt: string | null;
  pushedFingerprints?: string[];
  totalInserted: number;
  totalDuplicates: number;
  lastInserted: number;
  lastUnmatched: string[];
  lastError: string | null;
}

export interface SyncOutcome {
  state: SyncState;
  pushedNow: number;
  alreadyPushed: number;
  error: string | null;
}

export const bridge = {
  detectWow: () => invoke<WowInstall | null>('detect_wow'),
  selectWowPath: (path: string) => invoke<WowInstall>('select_wow_path', { path }),
  getSettings: () => invoke<AppSettings>('get_settings'),
  setServerUrl: (url: string) => invoke<AppSettings>('set_server_url', { url }),
  setAppUrl: (url: string) => invoke<AppSettings>('set_app_url', { url }),
  setSelectedAccount: (account: string) => invoke<AppSettings>('set_selected_account', { account }),

  requestDeviceCode: (deviceName: string) =>
    invoke<DeviceCodeResponse>('request_device_code', { deviceName }),
  pollDeviceToken: (deviceCode: string) =>
    invoke<{ status: 'pending' | 'granted' | 'expired'; expiresAt?: string }>('poll_device_token', {
      deviceCode,
    }),

  getTokenStatus: () => invoke<TokenStatus>('get_token_status'),
  revokeLocalToken: () => invoke<void>('revoke_local_token'),

  openExternal: (url: string) => invoke<void>('open_external', { url }),

  getSyncState: () => invoke<SyncState>('get_sync_state'),
  syncNow: () => invoke<SyncOutcome>('sync_now'),
};
