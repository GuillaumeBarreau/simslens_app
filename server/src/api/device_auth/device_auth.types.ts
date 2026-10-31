export interface DeviceCodeRecord {
  id: number;
  deviceCode: string;
  userCode: string;
  deviceName: string | null;
  expiresAt: Date;
  approvedAt: Date | null;
  consumedAt: Date | null;
  userId: string | null;
  scopes: string[];
}

export interface DeviceTokenRecord {
  id: number;
  userId: string;
  name: string;
  scopes: string[];
  expiresAt: Date;
}

export interface EligibleRealm {
  id: number;
  guildName: string;
  role: string;
}

export interface PendingApproval {
  deviceName: string | null;
  expiresAt: Date;
  eligibleRealms: EligibleRealm[];
}

export interface DeviceCodeGrant {
  deviceCode: string;
  userCode: string;
  expiresIn: number;
  /** Intervalle de scrutation recommandé, en secondes. */
  interval: number;
}

export interface DeviceAccessToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  scopes: string[];
}
