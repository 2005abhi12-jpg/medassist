/**
 * Timezone helpers.
 *
 * We store all dates in UTC in the database.
 * These helpers convert between user-local times and UTC
 * using the user's stored IANA timezone string.
 */

/**
 * Create a UTC Date for today at a given HH:MM in a specific timezone.
 *
 * @param {string} timeStr  "08:00" format
 * @param {string} timezone IANA timezone, e.g. "Asia/Kolkata"
 * @param {Date}   [date]   reference date (defaults to today)
 * @returns {Date} UTC Date object
 */
function localTimeToUTC(timeStr, timezone, date = new Date()) {
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Build an ISO string in the target timezone using Intl
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const localDate = formatter.format(date); // "2026-03-31"

  // Create a date string in the target timezone then parse as UTC offset
  const dateStr = `${localDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  // Get the offset for this timezone at this date
  const utcDate = new Date(dateStr + 'Z'); // treat as UTC first
  const offsetMs = getTimezoneOffsetMs(timezone, utcDate);

  return new Date(utcDate.getTime() - offsetMs);
}

/**
 * Get timezone offset in milliseconds for a given IANA timezone.
 */
function getTimezoneOffsetMs(timezone, date = new Date()) {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return tzDate.getTime() - utcDate.getTime();
}

/**
 * Format a UTC date to a readable time string in the user's timezone.
 */
function formatInTimezone(utcDate, timezone) {
  return new Date(utcDate).toLocaleString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

module.exports = {
  localTimeToUTC,
  getTimezoneOffsetMs,
  formatInTimezone,
};
