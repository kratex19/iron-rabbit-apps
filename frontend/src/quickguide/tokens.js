/**
 * Quick Guide — shared visual tokens.
 *
 * FirstRunTour and QuickAccess are NOT modified. Instead, both they and the
 * new QuickGuideModal now reference these constants so we get consistent
 * card sizing / spacing / animation timing without touching working code.
 */

export const QG_TOKENS = {
  // Max card body length (soft warning at 250, hard fail lint at 500)
  MAX_CARD_BODY_SOFT: 250,
  MAX_CARD_BODY_HARD: 500,
  MAX_CARDS_PER_GUIDE: 5,

  // Motion
  FADE_DURATION_MS: 220,
  CARD_TRANSITION_MS: 260,
  CHEVRON_ROTATE_MS: 200,

  // Triple-tap detection when guides are globally disabled
  TRIPLE_TAP_WINDOW_MS: 800,
  TRIPLE_TAP_REQUIRED: 3,

  // ID chip
  ID_CHIP_CLASSES: "text-[10px] font-mono opacity-40 hover:opacity-100 transition-opacity",
};

export const QG_STORAGE_KEY = "quickguide"; // lives inside app_settings[QG_STORAGE_KEY]

export const QG_DEFAULT_STATE = {
  schema_version: 1,
  enabled: true,
  auto_show: false, // LOCKED DEFAULT — discovery, not push
  seen_ids: [],
  content_version: "1.0.0",
  sync_status: "local-only", // reserved for Phase 5 Knowledge Distribution
  last_sync_at: null,
  diagnostics_enabled: false,
  analytics_buffer: [],
  feedback: {
    helpful_ids: [],
    not_helpful_ids: [],
    last_reset: null,
  },
  // One-time first-launch nudge on the `?` button. Cleared the moment the
  // user taps any Quick Guide button, opens a guide, or after ~15s of visibility.
  nudge_seen: false,
};
