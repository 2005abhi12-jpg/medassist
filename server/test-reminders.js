const mongoose = require('mongoose');
const env = require('./config/env');
const Reminder = require('./models/Reminder');
(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:49645/'); // use the in-memory db url given earlier
    const reminders = await Reminder.find({}).sort({createdAt: -1}).limit(5);
    console.log(reminders);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
