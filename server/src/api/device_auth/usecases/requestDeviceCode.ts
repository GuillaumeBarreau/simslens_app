/**
 * Ouvre un appairage : l'appareil reçoit un code technique qu'il conserve,
 * et un code court que l'utilisateur saisira sur la page /device.
 */

import {
  DEVICE_CODE_TTL_MS,
  formatUserCode,
  generateDeviceCode,
  generateUserCode,
} from '../device_auth.codes';
import repo from '../device_auth.repository';
import type { DeviceCodeGrant } from '../device_auth.types';

/** Une collision de code court est possible ; on retente au lieu d'échouer. */
const MAX_ATTEMPTS = 3;
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export async function requestDeviceCode({
  deviceName,
}: {
  deviceName?: string | null;
}): Promise<DeviceCodeGrant> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const deviceCode = generateDeviceCode();
      const userCode = generateUserCode();

      await repo.createDeviceCode({
        deviceCode,
        userCode,
        deviceName,
        expiresAt: new Date(Date.now() + DEVICE_CODE_TTL_MS),
      });

      return {
        deviceCode,
        userCode: formatUserCode(userCode),
        expiresIn: Math.floor(DEVICE_CODE_TTL_MS / 1000),
        interval: 5,
      };
    } catch (err) {
      const isCollision = (err as { code?: string }).code === UNIQUE_CONSTRAINT_VIOLATION;
      if (isCollision && attempt < MAX_ATTEMPTS - 1) continue;
      throw err;
    }
  }

  // Inatteignable : la boucle rend ou relance à chaque tour.
  throw new Error('Could not allocate a device code');
}
