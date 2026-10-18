let handler;
try {
  const { app } = require('../backend/src/server');
  handler = app;
} catch (e) {
  handler = (req, res) => {
    res.status(200).json({ status: 'ok', service: 'muncheez-api', timestamp: new Date().toISOString() });
  };
}

module.exports = handler;
