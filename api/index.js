// Vercel Serverless Function entry point
// Connects Vercel serverless invocations directly to the Express application
const app = require('../backend/src/server');

module.exports = app;
