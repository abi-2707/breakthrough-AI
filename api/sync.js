const fs = require('fs');
const path = require('path');

// In-memory cache for warm lambdas
let memoryStore = {
  patients: [],
  caregivers: [],
  voiceNotes: []
};

// On Vercel /tmp is writable and shared within a lambda lifetime/container
const TMP_FILE = path.join('/tmp', 'carehub_sync_store.json');

function loadStore() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const content = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.patients)) memoryStore.patients = parsed.patients;
        if (Array.isArray(parsed.caregivers)) memoryStore.caregivers = parsed.caregivers;
        if (Array.isArray(parsed.voiceNotes)) memoryStore.voiceNotes = parsed.voiceNotes;
      }
    }
  } catch (err) {
    // Ignore error and retain memoryStore
  }
}

function persistStore() {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(memoryStore), 'utf8');
  } catch (err) {
    // Write may fail in readonly environments; memoryStore remains valid
  }
}

// Initial load attempt
loadStore();

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    loadStore();
    return res.status(200).json(memoryStore);
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (data) {
        if (Array.isArray(data.patients)) memoryStore.patients = data.patients;
        if (Array.isArray(data.caregivers)) memoryStore.caregivers = data.caregivers;
        if (Array.isArray(data.voiceNotes)) memoryStore.voiceNotes = data.voiceNotes;
        persistStore();
      }
      return res.status(200).json({ status: 'ok', data: memoryStore });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
