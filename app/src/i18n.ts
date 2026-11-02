import 'dayjs/locale/fr';
import 'dayjs/locale/en';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enAttunements from './locales/en/attunements.json';
import enCalendar from './locales/en/calendar.json';
import enCommon from './locales/en/common.json';
import enContact from './locales/en/contact.json';
import enCreateRealm from './locales/en/createRealm.json';
import enDiscordSettings from './locales/en/discordSettings.json';
import enDroptimizer from './locales/en/droptimizer.json';
import enDungeons from './locales/en/dungeons.json';
import enEventRoster from './locales/en/eventRoster.json';
import enHistory from './locales/en/history.json';
import enInviteSettings from './locales/en/inviteSettings.json';
import enLootEquity from './locales/en/lootEquity.json';
import enMetadata from './locales/en/metadata.json';
import enMyActivity from './locales/en/myActivity.json';
import enPermissionsSettings from './locales/en/permissionsSettings.json';
import enRoster from './locales/en/roster.json';
import enSync from './locales/en/sync.json';
import enTracking from './locales/en/tracking.json';
import enValidationSettings from './locales/en/validationSettings.json';
import enWishlist from './locales/en/wishlist.json';
import enWishlistView from './locales/en/wishlistView.json';
import frAttunements from './locales/fr/attunements.json';
import frCalendar from './locales/fr/calendar.json';
import frCommon from './locales/fr/common.json';
import frContact from './locales/fr/contact.json';
import frCreateRealm from './locales/fr/createRealm.json';
import frDiscordSettings from './locales/fr/discordSettings.json';
import frDroptimizer from './locales/fr/droptimizer.json';
import frDungeons from './locales/fr/dungeons.json';
import frEventRoster from './locales/fr/eventRoster.json';
import frHistory from './locales/fr/history.json';
import frInviteSettings from './locales/fr/inviteSettings.json';
import frLootEquity from './locales/fr/lootEquity.json';
import frMetadata from './locales/fr/metadata.json';
import frMyActivity from './locales/fr/myActivity.json';
import frPermissionsSettings from './locales/fr/permissionsSettings.json';
import frRoster from './locales/fr/roster.json';
import frSync from './locales/fr/sync.json';
import frTracking from './locales/fr/tracking.json';
import frValidationSettings from './locales/fr/validationSettings.json';
import frWishlist from './locales/fr/wishlist.json';
import frWishlistView from './locales/fr/wishlistView.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: true,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common',
      'contact',
      'history',
      'metadata',
      'roster',
      'eventRoster',
      'tracking',
      'wishlist',
      'wishlistView',
      'droptimizer',
      'sync',
      'calendar',
      'dungeons',
      'createRealm',
      'validationSettings',
      'discordSettings',
      'permissionsSettings',
      'inviteSettings',
      'myActivity',
      'lootEquity',
      'attunements',
    ],
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: {
        calendar: enCalendar,
        common: enCommon,
        dungeons: enDungeons,
        contact: enContact,
        createRealm: enCreateRealm,
        eventRoster: enEventRoster,
        history: enHistory,
        metadata: enMetadata,
        roster: enRoster,
        tracking: enTracking,
        wishlist: enWishlist,
        wishlistView: enWishlistView,
        droptimizer: enDroptimizer,
        sync: enSync,
        validationSettings: enValidationSettings,
        discordSettings: enDiscordSettings,
        permissionsSettings: enPermissionsSettings,
        inviteSettings: enInviteSettings,
        myActivity: enMyActivity,
        lootEquity: enLootEquity,
        attunements: enAttunements,
      },
      fr: {
        calendar: frCalendar,
        common: frCommon,
        dungeons: frDungeons,
        contact: frContact,
        createRealm: frCreateRealm,
        eventRoster: frEventRoster,
        history: frHistory,
        metadata: frMetadata,
        roster: frRoster,
        tracking: frTracking,
        wishlist: frWishlist,
        wishlistView: frWishlistView,
        droptimizer: frDroptimizer,
        sync: frSync,
        validationSettings: frValidationSettings,
        discordSettings: frDiscordSettings,
        permissionsSettings: frPermissionsSettings,
        inviteSettings: frInviteSettings,
        myActivity: frMyActivity,
        lootEquity: frLootEquity,
        attunements: frAttunements,
      },
    },
  });

const updateDayjsLocale = (lng: string) => {
  const locale = lng.split('-')[0];
  dayjs.locale(locale);
};

const updateWowheadLocale = (lng: string) => {
  const locale = lng.split('-')[0];
  const wowheadDomain = locale === 'fr' ? 'fr' : 'www';
  const target = window as unknown as { whTooltips?: Record<string, unknown> };
  target.whTooltips = {
    ...target.whTooltips,
    domain: wowheadDomain,
  };
};

updateDayjsLocale(i18n.language);
updateWowheadLocale(i18n.language);

i18n.on('languageChanged', (lng) => {
  updateDayjsLocale(lng);
  updateWowheadLocale(lng);
});
