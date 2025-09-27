export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Simple response
  res.json({ 
    message: '🎉 API is working!',
    action: req.query.action,
    timestamp: new Date().toISOString(),
    data: { test: 'success' }
  });
}
