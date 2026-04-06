const { INTENTS } = require('../config/constants');

/**
 * Intent classification rules.
 * Each rule has an array of keyword patterns and the resulting intent.
 *
 * Phase 1: Keyword/regex matching (reliable for elderly speech patterns).
 * Phase 2: Replace with Dialogflow CX or fine-tuned model.
 */
const INTENT_RULES = [
  {
    intent: INTENTS.CONFIRM_DOSE,
    patterns: [
      /\b(took|taken|done|yes|had it|finished|completed|swallowed)\b/i,
      /\bi (took|had|take) (my|the) (medicine|medication|pill|dose|tablet)\b/i,
    ],
  },
  {
    intent: INTENTS.SNOOZE,
    patterns: [
      /\b(later|snooze|not now|remind me|wait|hold on|in a bit|few minutes)\b/i,
      /\bremind me (later|again|in)\b/i,
    ],
  },
  {
    intent: INTENTS.SKIP_DOSE,
    patterns: [
      /\b(skip|don't want|no thanks|refuse|won't take|not taking)\b/i,
    ],
  },
  {
    intent: INTENTS.QUERY_NEXT,
    patterns: [
      /\b(next|when|what time|upcoming|schedule)\b.*\b(dose|medicine|medication|pill|tablet)\b/i,
      /\bwhat('s| is) my next\b/i,
      /\bwhen do i take\b/i,
    ],
  },
  {
    intent: INTENTS.DRUG_INFO,
    patterns: [
      /\b(what is|tell me about|info|information|details|side effect)\b.*\b(medicine|medication|drug|pill|tablet)\b/i,
      /\bwhat is this (medicine|medication|pill)\b/i,
    ],
  },
  {
    intent: INTENTS.ADHERENCE_SUMMARY,
    patterns: [
      /\b(how am i doing|my score|progress|adherence|track record|performance|stats)\b/i,
    ],
  },
  {
    intent: INTENTS.EMERGENCY,
    patterns: [
      /\b(help|emergency|call (my )?caregiver|call (my )?doctor|i need help|not feeling well|feeling sick)\b/i,
    ],
  },
];

/**
 * Classify a voice transcript into an intent.
 *
 * @param {string} transcript  Raw speech-to-text output
 * @returns {{ intent: string, confidence: string }}
 */
function classifyIntent(transcript) {
  if (!transcript || typeof transcript !== 'string') {
    return { intent: INTENTS.UNKNOWN, confidence: 'none' };
  }

  const cleaned = transcript.trim().toLowerCase();

  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(cleaned)) {
        return { intent: rule.intent, confidence: 'high' };
      }
    }
  }

  return { intent: INTENTS.UNKNOWN, confidence: 'none' };
}

module.exports = { classifyIntent };
