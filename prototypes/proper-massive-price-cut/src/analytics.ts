import type { PostHog } from 'posthog-js';

type Properties = Record<string, string | number | boolean>;
type EventName = 'game_loaded' | 'game_started' | 'round_completed' | 'first_round_completed'
  | 'replay_started' | 'share_initiated' | 'share_cancelled' | 'share_failed'
  | 'share_dialog_closed' | 'share_link_copied' | 'result_save_requested';

const key = import.meta.env.VITE_POSTHOG_KEY?.trim();
const host = import.meta.env.VITE_POSTHOG_HOST?.trim();
const preferenceKey = 'price-cut-analytics-enabled';
const params = new URLSearchParams(location.search);
function id() {
  try { return crypto.randomUUID(); }
  catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
}
const attribution: Properties = {};
for (const name of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
  const value = params.get(name);
  if (value) attribution[name] = value.slice(0, 120);
}
const common: Properties = {
  game_id: 'proper-massive-price-cut',
  game_revision: import.meta.env.VITE_GAME_REVISION || 'unversioned',
  visit_id: id(),
  test_mode: import.meta.env.DEV || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
    || params.get('analytics_test') === '1' || params.get('utm_medium') === 'qa',
  ...attribution,
};
// Keep SDK-derived click IDs, search terms and duplicate campaign fields out.
// Preserve only our explicit event contract and basic anonymous browser metadata.
const permittedProperties = new Set([
  ...Object.keys(common), 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'round_id', 'round_number', 'is_replay', 'score', 'stars', 'active_play_seconds',
  'fans_admitted', 'fans_blocked', 'best_multiplier',
  'token', 'distinct_id', '$lib', '$lib_version', '$process_person_profile', '$is_identified',
  '$current_url', '$host', '$pathname', '$browser', '$browser_version',
  '$browser_language', '$browser_language_prefix', '$os', '$os_version', '$device_type',
  '$screen_width', '$screen_height', '$viewport_width', '$viewport_height', '$config_defaults',
]);
let client: PostHog | undefined;
let loading: Promise<void> | undefined;
let pending: Array<{ name: EventName; props: Properties }> = [];
let roundNumber = 0, roundId = '', roundCompleted = false;
let loaded = false;
let allowed = true;
try { allowed = localStorage.getItem(preferenceKey) !== 'false'; } catch { /* Preference is optional. */ }

export const analyticsConfigured = Boolean(key && host && /^https:\/\//.test(host));

function permitted() {
  const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
  return analyticsConfigured && allowed && params.get('analytics') !== 'off'
    && navigator.doNotTrack !== '1' && !privacy.globalPrivacyControl;
}

function cleanUrl(value: unknown) {
  if (typeof value !== 'string') return value;
  try { const url = new URL(value); return url.origin + url.pathname; } catch { return ''; }
}

function send(name: EventName, props: Properties = {}) {
  if (!permitted()) return;
  const properties = { ...common, ...props };
  try {
    if (client) { client.capture(name, properties); return; }
    if (pending.length < 50) pending.push({ name, props: properties });
    if (!loading) loading = import('posthog-js').then(({ default: posthog }) => {
      if (!permitted()) { pending = []; return; }
      posthog.init(key!, {
        api_host: host!,
        defaults: '2026-08-30',
        persistence: 'memory',
        person_profiles: 'never',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_dead_clicks: false,
        capture_performance: false,
        capture_exceptions: false,
        capture_heatmaps: false,
        disable_session_recording: true,
        enable_recording_console_log: false,
        disable_surveys: true,
        advanced_disable_flags: true,
        save_campaign_params: false,
        save_referrer: false,
        respect_dnt: true,
        opt_out_useragent_filter: common.test_mode === true,
        before_send: event => {
          if (!event || !permitted() || event.event.startsWith('$')) return null;
          for (const property of Object.keys(event.properties)) {
            if (!permittedProperties.has(property)) delete event.properties[property];
            else if (/(?:url|referrer)$/i.test(property)) event.properties[property] = cleanUrl(event.properties[property]);
          }
          return event;
        },
      });
      client = posthog;
      const queued = pending; pending = [];
      for (const event of queued) {
        if (permitted()) client.capture(event.name, event.props);
      }
    }).catch(error => {
      pending = [];
      if (import.meta.env.DEV) console.warn('Gameplay analytics unavailable', error);
    }).finally(() => { loading = undefined; });
  } catch { /* Analytics must never interrupt play, sharing, or restart. */ }
}

export function analyticsEnabled() { return permitted(); }

export function setAnalyticsEnabled(enabled: boolean) {
  allowed = enabled;
  try { localStorage.setItem(preferenceKey, String(enabled)); } catch { /* Session-only choice. */ }
  if (!enabled) {
    pending = [];
    try { client?.opt_out_capturing(); } catch { /* Play stays available. */ }
  } else {
    try { client?.opt_in_capturing({ captureEventName: false }); } catch { /* Play stays available. */ }
    trackLoaded();
  }
}

export function trackLoaded() {
  if (loaded || !permitted()) return;
  loaded = true;
  send('game_loaded');
}

export function trackRoundStarted() {
  roundNumber++;
  roundId = id();
  roundCompleted = false;
  const props = { round_id: roundId, round_number: roundNumber, is_replay: roundNumber > 1 };
  send('game_started', props);
  if (roundNumber > 1) send('replay_started', props);
}

export function trackRoundCompleted(props: Properties) {
  if (!roundId || roundCompleted) return;
  roundCompleted = true;
  trackRoundEvent('round_completed', props);
  if (roundNumber === 1) trackRoundEvent('first_round_completed', props);
}

export function trackRoundEvent(name: EventName, props: Properties = {}) {
  send(name, { ...props, round_id: roundId, round_number: roundNumber });
}

// Share can finish after the player has already restarted. Keep its original round.
export function roundEventTracker() {
  const round = { round_id: roundId, round_number: roundNumber };
  return (name: EventName, props: Properties = {}) => send(name, { ...props, ...round });
}
