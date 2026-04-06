const AdherenceLog = require('../models/AdherenceLog');
const { ADHERENCE_STATUS } = require('../config/constants');

/**
 * Get adherence logs for a user with filters.
 */
async function getAdherenceLogs(userId, { medicationId, from, to, status, limit = 100 } = {}) {
  const filter = { userId };
  if (medicationId) filter.medicationId = medicationId;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  return AdherenceLog.find(filter)
    .populate('medicationId', 'name dosage')
    .sort({ createdAt: -1 })
    .limit(limit);
}

/**
 * Get aggregated adherence statistics.
 */
async function getAdherenceStats(userId, { days = 30 } = {}) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await AdherenceLog.find({
    userId,
    createdAt: { $gte: since },
  });

  const total = logs.length;
  const taken = logs.filter((l) => l.status === ADHERENCE_STATUS.TAKEN).length;
  const missed = logs.filter((l) => l.status === ADHERENCE_STATUS.MISSED).length;
  const snoozed = logs.filter((l) => l.status === ADHERENCE_STATUS.SNOOZED).length;
  const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

  return {
    period: `${days} days`,
    total,
    taken,
    missed,
    snoozed,
    adherenceRate,
  };
}

/**
 * Get weekly adherence summary (last 7 days, day-by-day).
 */
async function getWeeklyStats(userId) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayLogs = await AdherenceLog.find({
      userId,
      createdAt: { $gte: date, $lt: nextDate },
    });

    const taken = dayLogs.filter((l) => l.status === ADHERENCE_STATUS.TAKEN).length;
    const total = dayLogs.length;

    days.push({
      date: date.toISOString().split('T')[0],
      taken,
      missed: total - taken,
      total,
      adherenceRate: total > 0 ? Math.round((taken / total) * 100) : null,
    });
  }

  return days;
}

/**
 * Get adherence stats grouped by medication.
 */
async function getStatsByMedication(userId, { days = 30 } = {}) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const results = await AdherenceLog.aggregate([
    {
      $match: {
        userId: require('mongoose').Types.ObjectId.createFromHexString(userId.toString()),
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: '$medicationId',
        total: { $sum: 1 },
        taken: { $sum: { $cond: [{ $eq: ['$status', ADHERENCE_STATUS.TAKEN] }, 1, 0] } },
        missed: { $sum: { $cond: [{ $eq: ['$status', ADHERENCE_STATUS.MISSED] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from: 'medications',
        localField: '_id',
        foreignField: '_id',
        as: 'medication',
      },
    },
    { $unwind: '$medication' },
    {
      $project: {
        medicationName: '$medication.name',
        dosage: '$medication.dosage',
        total: 1,
        taken: 1,
        missed: 1,
        adherenceRate: {
          $cond: [
            { $gt: ['$total', 0] },
            { $round: [{ $multiply: [{ $divide: ['$taken', '$total'] }, 100] }, 0] },
            0,
          ],
        },
      },
    },
  ]);

  return results;
}

module.exports = {
  getAdherenceLogs,
  getAdherenceStats,
  getWeeklyStats,
  getStatsByMedication,
};
