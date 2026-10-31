const { normalizeClass } = require('../utils/normalizeClass');

/**
 * Rôles utilisés pour la composition d'un raid.
 * Les DPS y sont séparés en MELEE / RANGED (placement dans le roster et
 * dans l'embed Discord).
 */
const RAID_ROLES = ['TANK', 'HEALER', 'MELEE', 'RANGED'];

/**
 * Rôles utilisés pour les groupes de donjon (M+), où les DPS ne sont pas
 * distingués par leur portée.
 */
const DUNGEON_ROLES = ['TANK', 'HEALER', 'DPS'];

/**
 * Rôle de raid de chaque spécialisation, par classe (snake_case, comme en base).
 *
 * Seul référentiel des rôles côté serveur (SIMS-207). Copie de
 * `scripts/data/specializations.json`, qui alimente `specializations.role` ;
 * un test vérifie que les deux restent identiques.
 */
const SPEC_ROLES_BY_CLASS = {
  warrior: { Arms: 'MELEE', Fury: 'MELEE', Protection: 'TANK' },
  paladin: { Holy: 'HEALER', Protection: 'TANK', Retribution: 'MELEE' },
  hunter: { 'Beast Mastery': 'RANGED', Marksmanship: 'RANGED', Survival: 'MELEE' },
  rogue: { Assassination: 'MELEE', Outlaw: 'MELEE', Subtlety: 'MELEE' },
  priest: { Discipline: 'HEALER', Holy: 'HEALER', Shadow: 'RANGED' },
  death_knight: { Blood: 'TANK', Frost: 'MELEE', Unholy: 'MELEE' },
  shaman: { Elemental: 'RANGED', Enhancement: 'MELEE', Restoration: 'HEALER' },
  mage: { Arcane: 'RANGED', Fire: 'RANGED', Frost: 'RANGED' },
  warlock: { Affliction: 'RANGED', Demonology: 'RANGED', Destruction: 'RANGED' },
  monk: { Brewmaster: 'TANK', Mistweaver: 'HEALER', Windwalker: 'MELEE' },
  druid: { Balance: 'RANGED', Feral: 'MELEE', Guardian: 'TANK', Restoration: 'HEALER' },
  demon_hunter: { Havoc: 'MELEE', Vengeance: 'TANK', Devourer: 'RANGED' },
  evoker: { Devastation: 'RANGED', Preservation: 'HEALER', Augmentation: 'RANGED' },
};

/**
 * Rôle d'une spec d'après son seul nom, quand la classe est inconnue.
 * Un nom porté par deux classes avec des rôles différents (Frost : DK mêlée,
 * Mage distance) est ambigu et n'y figure pas.
 */
const ROLE_BY_UNAMBIGUOUS_SPEC_NAME = (() => {
  const roles = new Map();
  for (const specs of Object.values(SPEC_ROLES_BY_CLASS)) {
    for (const [spec, role] of Object.entries(specs)) {
      roles.set(spec, roles.has(spec) && roles.get(spec) !== role ? null : role);
    }
  }
  for (const [spec, role] of roles) if (role === null) roles.delete(spec);
  return roles;
})();

function specNamesWithRole(role) {
  const names = new Set();
  for (const specs of Object.values(SPEC_ROLES_BY_CLASS)) {
    for (const [spec, specRole] of Object.entries(specs)) if (specRole === role) names.add(spec);
  }
  return names;
}

const TANK_SPECS = specNamesWithRole('TANK');

const HEALER_SPECS = specNamesWithRole('HEALER');

/**
 * Rôles que chaque classe peut tenir (toutes specs confondues), dérivés du
 * référentiel des specs. Sert à autoriser une assignation hors spé principale.
 */
const CLASS_ROLES = Object.fromEntries(
  Object.entries(SPEC_ROLES_BY_CLASS).map(([cls, specs]) => [
    cls,
    RAID_ROLES.filter((role) => Object.values(specs).includes(role)),
  ]),
);

/**
 * Normalise une valeur de rôle fournie par un client (casse libre).
 * @param {unknown} role
 * @returns {string} le rôle en majuscules, ou '' si non exploitable
 */
function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

/**
 * @param {unknown} role
 * @returns {boolean} true si le rôle est un rôle de raid valide
 */
function isRaidRole(role) {
  return RAID_ROLES.includes(normalizeRole(role));
}

/**
 * Rôles qu'une classe peut tenir. La classe est normalisée (« Death Knight »
 * comme « death_knight »).
 * @param {string | null | undefined} className
 * @returns {string[]}
 */
function getClassRoles(className) {
  return CLASS_ROLES[normalizeClass(className)] || [];
}

/**
 * Rôle d'une spec d'après le référentiel : par (classe, spec), sinon par le
 * seul nom de spec s'il n'est pas ambigu. Le nom de spec est sensible à la
 * casse, comme en base.
 * @returns {'TANK'|'HEALER'|'MELEE'|'RANGED'|null}
 */
function lookupSpecRole(className, specName) {
  if (!specName) return null;
  const byClass = SPEC_ROLES_BY_CLASS[normalizeClass(className)];
  if (byClass && Object.prototype.hasOwnProperty.call(byClass, specName)) return byClass[specName];
  return ROLE_BY_UNAMBIGUOUS_SPEC_NAME.get(specName) || null;
}

/**
 * Rôle de raid (TANK / HEALER / MELEE / RANGED) d'un personnage.
 *  1. `specialization.role` s'il est déjà un rôle de raid (tank/healer/melee/ranged) ;
 *  2. sinon le référentiel, par classe normalisée et nom de spec ;
 *  3. sinon RANGED.
 * @param {string | null | undefined} className - classe du personnage
 * @param {string | null | undefined} specName - nom de la spécialisation
 * @param {string | null | undefined} [specRole] - `specializations.role`
 * @returns {'TANK'|'HEALER'|'MELEE'|'RANGED'}
 */
function resolveRole(className, specName, specRole) {
  const stored = normalizeRole(specRole);
  if (RAID_ROLES.includes(stored)) return stored;
  return lookupSpecRole(className, specName) || 'RANGED';
}

/**
 * Portée d'un DPS : mêlée ou distance. Une spé tank joue au corps à corps ;
 * une spé soin, à distance.
 * @returns {'MELEE'|'RANGED'}
 */
function resolveDpsRange(className, specName, specRole) {
  const role = resolveRole(className, specName, specRole);
  return role === 'MELEE' || role === 'TANK' ? 'MELEE' : 'RANGED';
}

/**
 * Rôle de raid d'un inscrit : le rôle déclaré s'il est un rôle de raid, la
 * portée de sa spec s'il a déclaré DPS, sinon le rôle de sa spécialisation.
 * @param {string | null | undefined} declaredRole - rôle de l'inscription
 * @param {{ class?: string | null, specialization?: { name?: string | null, role?: string | null } | null } | null | undefined} character
 * @returns {'TANK'|'HEALER'|'MELEE'|'RANGED'}
 */
function resolveSignupRole(declaredRole, character) {
  const declared = normalizeRole(declaredRole);
  if (RAID_ROLES.includes(declared)) return declared;

  const className = character?.class;
  const specName = character?.specialization?.name;
  const specRole = character?.specialization?.role;
  if (declared === 'DPS') return resolveDpsRange(className, specName, specRole);
  return resolveRole(className, specName, specRole);
}

/**
 * Rôle de raid d'un personnage sans spécialisation (SIMS-209), que sa spé ne
 * peut donc pas donner :
 *  1. le rôle déclaré à l'inscription s'il est un rôle de raid ;
 *  2. DPS déclaré : la seule portée DPS de sa classe, sinon RANGED par défaut ;
 *  3. rien de déclaré : le rôle de sa classe si elle n'en tient qu'un ;
 *  4. sinon null : aucun rôle exploitable.
 * @param {string | null | undefined} declaredRole - rôle de l'inscription
 * @param {string | null | undefined} className - classe du personnage
 * @returns {'TANK'|'HEALER'|'MELEE'|'RANGED'|null}
 */
function resolveRoleWithoutSpec(declaredRole, className) {
  const declared = normalizeRole(declaredRole);
  if (RAID_ROLES.includes(declared)) return declared;

  const classRoles = getClassRoles(className);
  if (declared === 'DPS') {
    const dpsRoles = classRoles.filter((role) => role === 'MELEE' || role === 'RANGED');
    return dpsRoles.length === 1 ? dpsRoles[0] : 'RANGED';
  }
  return classRoles.length === 1 ? classRoles[0] : null;
}

/**
 * Déduit le rôle TANK / HEALER / DPS d'un personnage à partir de sa spec.
 * @param {string} [spec] - Nom de la spécialisation
 * @param {string} [className] - Classe, pour lever l'ambiguïté d'un nom de spec
 * @returns {'TANK'|'HEALER'|'DPS'}
 */
function roleFromSpec(spec, className) {
  const role = lookupSpecRole(className, spec);
  return role === 'TANK' || role === 'HEALER' ? role : 'DPS';
}

module.exports = {
  RAID_ROLES,
  DUNGEON_ROLES,
  SPEC_ROLES_BY_CLASS,
  TANK_SPECS,
  HEALER_SPECS,
  CLASS_ROLES,
  getClassRoles,
  lookupSpecRole,
  resolveRole,
  resolveDpsRange,
  resolveSignupRole,
  resolveRoleWithoutSpec,
  roleFromSpec,
  normalizeRole,
  isRaidRole,
};
