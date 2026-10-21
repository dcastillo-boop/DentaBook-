/* ============================================================
   Backend Server 
   ============================================================ */

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------
   Paths
------------------------------------------------------------ */
const ROOT_DIR          = path.join(__dirname, '..');
const DATA_DIR          = path.join(__dirname, 'data');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const SMS_LOG_FILE      = path.join(DATA_DIR, 'sms-log.json');

/* ------------------------------------------------------------
   Ensure data files exist
------------------------------------------------------------ */
function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(APPOINTMENTS_FILE)) fs.writeFileSync(APPOINTMENTS_FILE, '[]', 'utf8');
  if (!fs.existsSync(SMS_LOG_FILE))      fs.writeFileSync(SMS_LOG_FILE, '[]', 'utf8');
}
ensureDataFiles();

/* ------------------------------------------------------------
   Middleware
------------------------------------------------------------ */
app.use(express.json());

// Prevent browsers from caching API responses. Every request
// hits the server so callers always get the freshest data.
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Request logger — useful as testing evidence
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Silence favicon 404s — no favicon file required
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Static frontend (serves index.html, css/, js/, patient/, etc.)
app.use(express.static(ROOT_DIR));

/* ------------------------------------------------------------
   JSON file helpers 
------------------------------------------------------------ */
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`readJson(${filePath}) failed:`, err.message);
    return [];
  }
}

let writeQueue = Promise.resolve();
function writeJson(filePath, data) {
  writeQueue = writeQueue.then(() =>
    fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
  );
  return writeQueue;
}

/* ------------------------------------------------------------
   Conflict detection
   ------------------------------------------------------------
 */
function hasConflict(appointments, { dentistId, start, end, excludeId }) {
  const startMs = new Date(start).getTime();
  const endMs   = new Date(end).getTime();

  return appointments.some(a => {
    if (a.id === excludeId) return false;
    if (a.dentistId !== dentistId) return false;
    if (!['pending', 'confirmed'].includes(a.status)) return false;

    const aStart = new Date(a.start).getTime();
    const aEnd   = new Date(a.end).getTime();
    return startMs < aEnd && endMs > aStart;
  });
}

/* ============================================================
   Appointments API
   ============================================================ */

// GET /api/appointments  (?clinicId= &patientId= &status= &dentistId=)
app.get('/api/appointments', (req, res) => {
  let list = readJson(APPOINTMENTS_FILE);

  if (req.query.clinicId)  list = list.filter(a => a.clinicId  === req.query.clinicId);
  if (req.query.patientId) list = list.filter(a => a.patientId === req.query.patientId);
  if (req.query.dentistId) list = list.filter(a => a.dentistId === req.query.dentistId);
  if (req.query.status)    list = list.filter(a => a.status    === req.query.status);

  res.json(list);
});

// GET /api/appointments/:id
app.get('/api/appointments/:id', (req, res) => {
  const list  = readJson(APPOINTMENTS_FILE);
  const found = list.find(a => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Appointment not found' });
  res.json(found);
});

// POST /api/appointments
app.post('/api/appointments', async (req, res) => {
  const required = ['id', 'patientId', 'clinicId', 'dentistId', 'serviceId', 'start', 'end'];
  const missing  = required.filter(k => !req.body[k]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  const list = readJson(APPOINTMENTS_FILE);

  if (list.some(a => a.id === req.body.id)) {
    return res.status(409).json({ error: 'Appointment with this ID already exists' });
  }

  const conflict = hasConflict(list, {
    dentistId: req.body.dentistId,
    start:     req.body.start,
    end:       req.body.end,
  });
  if (conflict) {
    return res.status(409).json({
      error: 'Slot conflict: this dentist already has a booking at this time',
    });
  }

  const appointment = {
    ...req.body,
    status:    req.body.status || 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  list.push(appointment);
  await writeJson(APPOINTMENTS_FILE, list);
  res.status(201).json(appointment);
});

// PATCH /api/appointments/:id
app.patch('/api/appointments/:id', async (req, res) => {
  const list = readJson(APPOINTMENTS_FILE);
  const idx  = list.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Appointment not found' });

  const merged = { ...list[idx], ...req.body, updatedAt: new Date().toISOString() };

  // Re-check conflicts if the slot moved
  if (req.body.start || req.body.end || req.body.dentistId) {
    const conflict = hasConflict(list, {
      dentistId: merged.dentistId,
      start:     merged.start,
      end:       merged.end,
      excludeId: req.params.id,
    });
    if (conflict) {
      return res.status(409).json({
        error: 'Slot conflict: this dentist already has a booking at this time',
      });
    }
  }

  list[idx] = merged;
  await writeJson(APPOINTMENTS_FILE, list);
  res.json(merged);
});

/* ============================================================
   SMS Log API
   ============================================================ */

// GET /api/sms-log
app.get('/api/sms-log', (req, res) => {
  res.json(readJson(SMS_LOG_FILE));
});

// POST /api/sms-log
app.post('/api/sms-log', async (req, res) => {
  const { phone, type, message } = req.body;
  if (!phone || !type || !message) {
    return res.status(400).json({ error: 'Missing required fields: phone, type, message' });
  }

  const log = readJson(SMS_LOG_FILE);
  const entry = {
    id:     'sms-' + Date.now(),
    phone,
    type,
    message,
    sentAt: new Date().toISOString(),
    status: 'sent',
  };
  log.push(entry);
  await writeJson(SMS_LOG_FILE, log);
  res.status(201).json(entry);
});

/* ============================================================
   Health check
   ============================================================ */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ============================================================
   Fallbacks
   ============================================================ */
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(ROOT_DIR, '404.html'));
});

/* ============================================================
   Start
   ============================================================ */
const server = app.listen(PORT, () => {
  console.log(`\nDentaBook server running`);
  console.log(`  Frontend : http://localhost:${PORT}/index.html`);
  console.log(`  API      : http://localhost:${PORT}/api`);
  console.log(`  Health   : http://localhost:${PORT}/api/health\n`);
});

/* ------------------------------------------------------------
shutdown (Ctrl+C)
------------------------------------------------------------ */
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});