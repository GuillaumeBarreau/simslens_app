export enum Permission {
  MANAGE_REALM = 'manage_realm', // Edit settings, invite users
  DELETE_REALM = 'delete_realm', // Dangerous

  VIEW_ROSTER = 'view_roster', // See the list
  EDIT_ROSTER = 'edit_roster', // Add/Remove characters manually
  SYNC_CHARACTERS = 'sync_characters', // Run Blizzard Sync

  MANAGE_RAID = 'manage_raid', // Create/Delete raids, Open instances
  MANAGE_INSTANCE = 'manage_instance', // Manage Instance Panel
  VIEW_LOOT_HISTORY = 'view_loot_history', // See what dropped
  ASSIGN_LOOT = 'assign_loot', // Helper tool access
  DELETE_LOOT = 'delete_loot', // Remove entries
  EDIT_LOOT = 'edit_loot', // Change attribution

  IMPORT_SIMC = 'import_simc', // Upload SimC strings

  VIEW_WISHLIST = 'view_wishlist', // View wishlists
  MANAGE_WISHLIST = 'manage_wishlist', // Edit own wishlist

  CREATE_EVENT = 'create_event', // Create raid events
  EDIT_EVENT = 'edit_event', // Edit raid events
  DELETE_EVENT = 'delete_event', // Delete raid events
  SIGNUP_EVENT = 'signup_event', // Signup to events
  MANAGE_SIGNUPS = 'manage_signups', // Manage other players' signups

  MANAGE_EVENT_ROSTER = 'manage_event_roster', // Add/Remove characters manually

  VIEW_ACTIVITY_LOG = 'view_activity_log', // View realm activity history
}
