import type { DeviceCodeRecord, DeviceTokenRecord } from './device_auth.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const deviceAuthRepository: {
  createDeviceCode(data: {
    deviceCode: string;
    userCode: string;
    deviceName?: string | null;
    expiresAt: Date;
  }): Promise<DeviceCodeRecord>;
  findByDeviceCode(deviceCode: string): Promise<DeviceCodeRecord | null>;
  findByUserCode(userCode: string): Promise<DeviceCodeRecord | null>;
  approveDeviceCode(id: number, data: { userId: string; scopes: string[] }): Promise<unknown>;
  markDeviceCodeConsumed(id: number): Promise<unknown>;
  createToken(data: {
    userId: string;
    name: string;
    tokenHash: string;
    scopes: string[];
    expiresAt: Date;
  }): Promise<DeviceTokenRecord>;
  listTokensByUser(userId: string): Promise<DeviceTokenRecord[]>;
  revokeToken(id: number, userId: string): Promise<{ count: number }>;
};

export default deviceAuthRepository;
