let memoryStore = {
  patients: [],
  caregivers: [],
  voiceNotes: []
};

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json(memoryStore);
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (data) {
        if (Array.isArray(data.patients)) memoryStore.patients = data.patients;
        if (Array.isArray(data.caregivers)) memoryStore.caregivers = data.caregivers;
        if (Array.isArray(data.voiceNotes)) memoryStore.voiceNotes = data.voiceNotes;
      }
      return res.status(200).json({ status: 'ok', data: memoryStore });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
