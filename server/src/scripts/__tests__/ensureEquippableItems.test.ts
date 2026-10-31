// ensureEquippableItems : le fichier Raidbots n'est plus versionné et se télécharge
// s'il manque (SIMS-284).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const {
  SOURCE_URL,
  MIN_BYTES,
  MIN_ITEMS,
  ensureEquippableItems,
} = require('../data/ensureEquippableItems');

const silent = { log: vi.fn() };

/** Un contenu valide : assez d'objets, et assez lourd pour passer le contrôle de taille. */
function validItemsJson(): string {
  const padding = 'x'.repeat(Math.ceil(MIN_BYTES / MIN_ITEMS));
  const items = Array.from({ length: MIN_ITEMS }, (_, id) => ({ id, name: `${id}${padding}` }));
  return JSON.stringify(items);
}

let dir: string;
let targetPath: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ensure-items-'));
  targetPath = path.join(dir, 'equippable-items.json');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('ensureEquippableItems', () => {
  it('ne télécharge rien si le fichier est présent', async () => {
    fs.writeFileSync(targetPath, '[]');
    const download = vi.fn();

    await expect(ensureEquippableItems({ targetPath, download, log: silent })).resolves.toBe(
      targetPath,
    );
    expect(download).not.toHaveBeenCalled();
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('[]');
  });

  it('télécharge et installe le fichier s’il est absent', async () => {
    const content = validItemsJson();
    const download = vi.fn(async (_url: string, dest: string) => {
      fs.writeFileSync(dest, content);
    });

    await expect(ensureEquippableItems({ targetPath, download, log: silent })).resolves.toBe(
      targetPath,
    );
    expect(download).toHaveBeenCalledTimes(1);
    expect(download.mock.calls[0][0]).toBe(SOURCE_URL);
    expect(fs.readFileSync(targetPath, 'utf8')).toBe(content);
    // Le fichier temporaire ne traîne pas.
    expect(fs.existsSync(download.mock.calls[0][1])).toBe(false);
  });

  it('échoue avec un message clair si le réseau est indisponible', async () => {
    const download = vi.fn(async (_url: string, dest: string) => {
      fs.writeFileSync(dest, 'partiel');
      throw new Error('getaddrinfo ENOTFOUND www.raidbots.com');
    });

    await expect(ensureEquippableItems({ targetPath, download, log: silent })).rejects.toThrow(
      /Impossible de télécharger .*ENOTFOUND.*Vérifiez l'accès réseau/,
    );
    expect(fs.existsSync(targetPath)).toBe(false);
    expect(fs.existsSync(download.mock.calls[0][1])).toBe(false);
  });

  it('refuse un fichier trop petit et n’installe rien', async () => {
    const download = vi.fn(async (_url: string, dest: string) => {
      fs.writeFileSync(dest, '<html>maintenance</html>');
    });

    await expect(ensureEquippableItems({ targetPath, download, log: silent })).rejects.toThrow(
      /suspiciously small/,
    );
    expect(fs.existsSync(targetPath)).toBe(false);
  });

  it('refuse un contenu qui n’est pas une liste d’objets', async () => {
    const download = vi.fn(async (_url: string, dest: string) => {
      fs.writeFileSync(dest, JSON.stringify({ data: 'x'.repeat(MIN_BYTES) }));
    });

    await expect(ensureEquippableItems({ targetPath, download, log: silent })).rejects.toThrow(
      /shape unexpected/,
    );
    expect(fs.existsSync(targetPath)).toBe(false);
  });
});
