/**
 * Sérialisation des identifiants BigInt.
 *
 * Certaines colonnes remontent en BigInt, que JSON.stringify refuse. La
 * conversion est faite en profondeur avant de répondre.
 */

export function serializeBigInt<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(serializeBigInt) as unknown as T;
  }

  if (typeof value === 'bigint') {
    return Number(value) as unknown as T;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = typeof entry === 'bigint' ? Number(entry) : serializeBigInt(entry);
    }

    return result as T;
  }

  return value;
}
