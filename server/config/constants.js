// ─── Roles ──────────────────────────────────────────
const ROLES = {
  PATIENT: 'patient',
  CAREGIVER: 'caregiver',
  ADMIN: 'admin',
};

// ─── Reminder statuses (state machine) ─────────────
const REMINDER_STATUS = {
  SCHEDULED: 'SCHEDULED',
  TRIGGERED: 'TRIGGERED',
  TAKEN: 'TAKEN',
  MISSED: 'MISSED',
  SNOOZED: 'SNOOZED',
  ALERT_SENT: 'ALERT_SENT',
};

// ─── Adherence log statuses ────────────────────────
const ADHERENCE_STATUS = {
  TAKEN: 'TAKEN',
  MISSED: 'MISSED',
  SNOOZED: 'SNOOZED',
};

// ─── Alert types ───────────────────────────────────
const ALERT_TYPE = {
  MISSED_DOSE: 'MISSED_DOSE',
  LOW_ADHERENCE: 'LOW_ADHERENCE',
  INTERACTION_WARNING: 'INTERACTION_WARNING',
  SYSTEM: 'SYSTEM',
  MISSED: 'MISSED',
  HELP: 'HELP',
};

const ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// ─── Notification channels ─────────────────────────
const CHANNELS = {
  VOICE: 'voice',
  SMS: 'sms',
  PUSH: 'push',
};

// ─── Recurrence ────────────────────────────────────
const RECURRENCE = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  CUSTOM: 'custom',
};

// ─── Voice intents ─────────────────────────────────
const INTENTS = {
  CONFIRM_DOSE: 'CONFIRM_DOSE',
  SNOOZE: 'SNOOZE',
  SKIP_DOSE: 'SKIP_DOSE',
  QUERY_NEXT: 'QUERY_NEXT',
  DRUG_INFO: 'DRUG_INFO',
  ADHERENCE_SUMMARY: 'ADHERENCE_SUMMARY',
  EMERGENCY: 'EMERGENCY',
  UNKNOWN: 'UNKNOWN',
};

module.exports = {
  ROLES,
  REMINDER_STATUS,
  ADHERENCE_STATUS,
  ALERT_TYPE,
  ALERT_SEVERITY,
  CHANNELS,
  RECURRENCE,
  INTENTS,
};
