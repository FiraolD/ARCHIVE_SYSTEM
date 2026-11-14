const os = require('os');

const frontendPort = process.env.FRONTEND_PORT || '3009';
const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGINS,
]
  .filter(Boolean)
  .flatMap((origins) => origins.split(','))
  .map((origin) => origin.trim())
  .filter(Boolean);

const localOrigins = [
  `http://localhost:${frontendPort}`,
  `http://127.0.0.1:${frontendPort}`,
  ...Object.values(os.networkInterfaces())
    .flat()
    .filter((network) => network && network.family === 'IPv4' && !network.internal)
    .map((network) => `http://${network.address}:${frontendPort}`),
];

const allowedOrigins = new Set([...localOrigins, ...configuredOrigins]);

function isAllowedOrigin(origin, callback) {
  if (!origin || allowedOrigins.has(origin)) {
    return callback(null, true);
  }
  return callback(new Error('Not allowed by CORS'));
}

module.exports = { isAllowedOrigin };
