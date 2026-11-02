/**
 * Référentiel des attunements de WoW Forever (SIMS-029).
 *
 * Drakefire Amulet : chaque membre du raid doit l'avoir dans son sac pour entrer
 * dans Onyxia's Lair ; la chaîne de quêtes dépend de la faction. IDs de quête
 * de Classic, conservés par Forever (vérifiés sur Wowhead Forever le 2026-11-02).
 * Sources : https://news.blizzard.com/en-gb/article/24303009,
 * https://www.wowhead.com/forever/quest=6502, https://www.wowhead.com/forever/quest=6602
 */

import type { AttunementDefinition } from './attunement.types';

export const ATTUNEMENTS: Record<string, AttunementDefinition> = {
  drakefire_amulet: {
    key: 'drakefire_amulet',
    raid: "Onyxia's Lair",
    itemId: 16309,
    chains: {
      alliance: [
        { questId: 4182, name: 'Dragonkin Menace' },
        { questId: 4183, name: 'The True Masters' },
        { questId: 4184, name: 'The True Masters' },
        { questId: 4185, name: 'The True Masters' },
        { questId: 4186, name: 'The True Masters' },
        { questId: 4223, name: 'The True Masters' },
        { questId: 4224, name: 'The True Masters' },
        { questId: 4241, name: 'Marshal Windsor' },
        { questId: 4242, name: 'Abandoned Hope' },
        { questId: 4264, name: 'A Crumpled Up Note' },
        { questId: 4282, name: 'A Shred of Hope' },
        { questId: 4322, name: 'Jail Break!' },
        { questId: 6402, name: 'Stormwind Rendezvous' },
        { questId: 6403, name: 'The Great Masquerade' },
        { questId: 6501, name: "The Dragon's Eye" },
        { questId: 6502, name: 'Drakefire Amulet' },
      ],
      horde: [
        { questId: 4903, name: "Warlord's Command" },
        { questId: 4941, name: "Eitrigg's Wisdom" },
        { questId: 4974, name: 'For The Horde!' },
        { questId: 6566, name: 'What the Wind Carries' },
        { questId: 6567, name: 'The Champion of the Horde' },
        { questId: 6568, name: 'The Testament of Rexxar' },
        { questId: 6569, name: 'Oculus Illusions' },
        { questId: 6570, name: 'Emberstrife' },
        { questId: 6582, name: 'The Test of Skulls, Scryer' },
        { questId: 6583, name: 'The Test of Skulls, Somnus' },
        { questId: 6584, name: 'The Test of Skulls, Chronalis' },
        { questId: 6585, name: 'The Test of Skulls, Axtroz' },
        { questId: 6601, name: 'Ascension...' },
        { questId: 6602, name: 'Blood of the Black Dragon Champion' },
      ],
    },
  },
};

export const ATTUNEMENT_KEYS = Object.keys(ATTUNEMENTS);
