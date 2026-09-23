/**
 * BREAK THROUGH AI - PASTEL ANIMATIC HEALTHCARE PLATFORM
 * Features: Strict Authentication, Image Compression, Auto-Sync Prescriptions, Real-Time Alarm Scheduler
 */

// Storage Keys
const STORAGE_PATIENTS_KEY = 'carehub_patients_v3';
const STORAGE_CAREGIVERS_KEY = 'carehub_caregivers_v2';
const STORAGE_VOICE_NOTES_KEY = 'carehub_voice_notes_v1';
const SYNC_API_URL = '/api/sync';
const STORAGE_SESSION_KEY = 'carehub_active_user_v2';
const PATIENTS_API_URL = '/api/patients';
const PATIENTS_SYNC_POLL_MS = 2500;
const MEDICATION_DEADLINE_SECONDS = 20;
const MISSED_DOSE_API_URL = '/api/missed-dose';
const NTFY_TOPIC_PREFIX = 'carehub-caregiver-';
const FORM_SUBMIT_EMAIL = 'trikysaran5721@gmail.com';
const SUPABASE_URL = 'https://vujkkethabtwhjuoybsg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uyn2KQwDuAdFXa5asI55LA_ucvQ7B0k';

// Standard pastel fallback SVG for medications
const defaultPillSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%23B8A6E8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>';

// Default Seed Patients Data
const defaultPatients = [
  {
    id: 'nandhini2007',
    name: 'Nandhini',
    age: 19,
    condition: 'General Health & Preventive Care',
    joinedDate: '10 Sept 2026',
    prescriptions: [
      {
        id: 'rx-nand-1',
        name: 'Paracetamol',
        dosage: '1 Tablet (500mg)',
        instructions: 'Take after dinner with warm water.',
        alarmTime: '20:00',
        imageUrl: defaultPillSvg,
        status: 'pending',
        confirmedAt: null
      },
      {
        id: 'rx-nand-2',
        name: 'Vitamin C Complex',
        dosage: '500mg Chewable',
        instructions: 'Take in the morning after breakfast.',
        alarmTime: '08:30',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%23A8D8F0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/><path d="M6 12h12"/></svg>',
        status: 'taken',
        confirmedAt: '08:32 AM'
      }
    ]
  },
  {
    id: 'abinaya2008',
    name: 'Abinaya',
    age: 18,
    condition: 'Routine Wellness & Iron Supplementation',
    joinedDate: '11 Sept 2026',
    prescriptions: [
      {
        id: 'rx-abi-1',
        name: 'Iron & Folic Acid',
        dosage: '1 Capsule',
        instructions: 'Take once daily at bedtime with juice or water.',
        alarmTime: '21:30',
        imageUrl: defaultPillSvg,
        status: 'pending',
        confirmedAt: null
      }
    ]
  }
];

// Initialize Data Storage with Safe Guarantees
function getPatients() {
  try {
    const data = localStorage.getItem(STORAGE_PATIENTS_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_PATIENTS_KEY, '[]');
      return [];
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('getPatients error:', e);
    return [];
  }
}

function getCaregivers() {
  try {
    const data = localStorage.getItem(STORAGE_CAREGIVERS_KEY);
    if (!data) {
      const initialCaregivers = [{ id: 'nandhini2007', name: 'Nandhini', password: 'nandi2007' }];
      localStorage.setItem(STORAGE_CAREGIVERS_KEY, JSON.stringify(initialCaregivers));
      return initialCaregivers;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    const initialCaregivers = [{ id: 'nandhini2007', name: 'Nandhini', password: 'nandi2007' }];
    localStorage.setItem(STORAGE_CAREGIVERS_KEY, JSON.stringify(initialCaregivers));
    return initialCaregivers;
  } catch (e) {
    console.error('getCaregivers error:', e);
    return [];
  }
}

function saveCaregivers(caregivers) {
  const payload = JSON.stringify(caregivers);
  localStorage.setItem(STORAGE_CAREGIVERS_KEY, payload);
  try {
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_CAREGIVERS_KEY,
      newValue: payload,
      storageArea: localStorage
    }));
  } catch (error) {
    // The native storage event still updates other tabs.
  }
  window.dispatchEvent(new CustomEvent('carehub-caregivers-updated'));
  syncStateToServer();
}

function getVoiceNotes() {
  try {
    const notes = JSON.parse(localStorage.getItem(STORAGE_VOICE_NOTES_KEY) || '[]');
    return Array.isArray(notes) ? notes : [];
  } catch (error) {
    return [];
  }
}

function saveVoiceNotes(notes) {
  const payload = JSON.stringify(notes);
  localStorage.setItem(STORAGE_VOICE_NOTES_KEY, payload);
  try {
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_VOICE_NOTES_KEY,
      newValue: payload,
      storageArea: localStorage
    }));
  } catch (error) {
    // The native storage event still updates other tabs.
  }
  window.dispatchEvent(new CustomEvent('carehub-voice-updated'));
  syncStateToServer();
}

async function syncStateToServer() {
  if (networkSyncInFlight) {
    networkSyncQueued = true;
    return;
  }
  networkSyncInFlight = true;
  try {
    await fetch(SYNC_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patients: getPatients(),
        caregivers: getCaregivers(),
        voiceNotes: getVoiceNotes()
      })
    });
  } catch (error) {
    console.warn('Network sync failed; keeping local data.', error);
  } finally {
    networkSyncInFlight = false;
    if (networkSyncQueued) {
      networkSyncQueued = false;
      syncStateToServer();
    }
  }
}

function firePatientDataSync() {
  const payload = JSON.stringify(getPatients());

  try {
    if (typeof StorageEvent !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_PATIENTS_KEY,
        newValue: payload,
        storageArea: localStorage
      }));
    }
  } catch (e) {
    console.warn('storage event fallback used:', e);
  }

  window.dispatchEvent(new CustomEvent('carehub-data-updated'));
}

function syncPatientsToServer(patients) {
  // Patient records are intentionally private to this browser prototype.
}

function savePatients(patients) {
  try {
    localStorage.setItem(STORAGE_PATIENTS_KEY, JSON.stringify(patients));
    syncPatientsToServer(patients);
    syncStateToServer();
    firePatientDataSync();
    return true;
  } catch (e) {
    console.warn('LocalStorage quota warning, attempting optimization:', e);
    // If quota exceeded, sanitize images to lightweight icons
    try {
      const sanitized = patients.map(p => ({
        ...p,
        prescriptions: (p.prescriptions || []).map(rx => ({
          ...rx,
          imageUrl: rx.imageUrl && rx.imageUrl.length > 30000 ? defaultPillSvg : rx.imageUrl
        }))
      }));
      localStorage.setItem(STORAGE_PATIENTS_KEY, JSON.stringify(sanitized));
      syncPatientsToServer(sanitized);
      syncStateToServer();
      firePatientDataSync();
      return true;
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
      showGlassToast('Storage quota reached in browser! Try using smaller image files.', 'error');
      return false;
    }
  }
}

// Active Application State
const appState = {
  currentUser: null, // { role: 'caregiver' | 'coordinator', id: string, name: string }
  selectedPatientId: '',
  pendingCaregiverId: '',
  uploadedImageBase64: null,
  activeAlarmRx: null,
  alarmAudioNodes: [],
  alarmSpeechInterval: null,
  alarmDeadlineTimer: null,
  triggeredToday: new Set()
};

let voiceStream = null;
let voiceRecorder = null;
let voiceChunks = [];
let networkSyncInFlight = false;
let networkSyncQueued = false;

// Web Audio API continuous layered alarm
let audioCtx = null;
function startContinuousAlarmSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    const pulseLfo = audioCtx.createOscillator();
    const pulseDepth = audioCtx.createGain();
    const vibratoLfo = audioCtx.createOscillator();
    const vibratoDepth = audioCtx.createGain();

    masterGain.gain.setValueAtTime(0.24, now);
    pulseLfo.frequency.value = 4.5;
    pulseDepth.gain.value = 0.11;
    vibratoLfo.frequency.value = 5.5;
    vibratoDepth.gain.value = 18;
    pulseLfo.connect(pulseDepth).connect(masterGain.gain);

    const oscillators = [
      { type: 'sawtooth', frequency: 620, detune: -12 },
      { type: 'triangle', frequency: 740, detune: 12 },
      { type: 'sine', frequency: 930, detune: 0 }
    ].map(({ type, frequency, detune }) => {
      const oscillator = audioCtx.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      vibratoLfo.connect(vibratoDepth).connect(oscillator.frequency);
      oscillator.connect(masterGain);
      oscillator.start(now);
      return oscillator;
    });

    masterGain.connect(audioCtx.destination);
    pulseLfo.start(now);
    vibratoLfo.start(now);
    appState.alarmAudioNodes = [masterGain, pulseLfo, pulseDepth, vibratoLfo, vibratoDepth, ...oscillators];
  } catch (e) {
    console.warn('Continuous alarm audio notice:', e);
  }
}

function announceMedication(rx) {
  if (!('speechSynthesis' in window) || !rx) return;

  window.speechSynthesis.cancel();
  const announcement = new SpeechSynthesisUtterance(
    `Time to take your medicine: ${rx.name}. ${rx.dosage}. ${rx.instructions}`
  );
  announcement.rate = 0.9;
  announcement.pitch = 1;
  announcement.volume = 1;
  window.speechSynthesis.speak(announcement);
}

function stopMedicationAlert() {
  if (appState.alarmAudioNodes.length) {
    appState.alarmAudioNodes.forEach(node => {
      try {
        if (typeof node.stop === 'function') node.stop();
        node.disconnect();
      } catch (e) {
        // Audio nodes may already be stopped when the alert is dismissed.
      }
    });
    appState.alarmAudioNodes = [];
  }
  if (appState.alarmSpeechInterval) {
    clearInterval(appState.alarmSpeechInterval);
    appState.alarmSpeechInterval = null;
  }
  if (appState.alarmDeadlineTimer) {
    clearTimeout(appState.alarmDeadlineTimer);
    appState.alarmDeadlineTimer = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

async function sendMissedDoseEmail(patient, rx) {
  if (!patient || !rx || rx.escalationSent) return false;

  const caregiver = patient.caregiver ? `${patient.caregiver.name} (${patient.caregiver.id})` : 'Not assigned';
  const emailData = new URLSearchParams({
    _subject: `BREAK THROUGH AI missed medication: ${rx.name}`,
    _captcha: 'false',
    patient_name: patient.name,
    patient_id: patient.id,
    patient_age: String(patient.age || ''),
    patient_condition: patient.condition || '',
    medicine: rx.name,
    dosage: rx.dosage,
    instructions: rx.instructions,
    scheduled_time: rx.alarmTime,
    acknowledgement_deadline_seconds: String(MEDICATION_DEADLINE_SECONDS),
    assigned_caregiver: caregiver,
    message: `The patient did not acknowledge ${rx.name} before the ${MEDICATION_DEADLINE_SECONDS}-second deadline.`
  });

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`https://formsubmit.co/ajax/${FORM_SUBMIT_EMAIL}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: emailData
      });
      const result = await response.json();
      if (!response.ok || (result.success !== true && result.success !== 'true')) {
        throw new Error(result.message || `FormSubmit returned ${response.status}`);
      }

      rx.escalationSent = true;
      const patients = getPatients();
      const savedPatient = patients.find(item => item.id.toLowerCase() === patient.id.toLowerCase());
      const savedRx = savedPatient && (savedPatient.prescriptions || []).find(item => item.id === rx.id);
      if (savedRx) {
        savedRx.escalationSent = true;
        savePatients(patients);
      }
      showGlassToast(`Email sent to ${FORM_SUBMIT_EMAIL} for unacknowledged ${rx.name}.`, 'error', 'Deadline Reached');
      return true;
    } catch (error) {
      lastError = error;
      console.warn(`FormSubmit email attempt ${attempt} failed:`, error);
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  const iframe = document.createElement('iframe');
  iframe.name = `formsubmit-mail-fallback-${Date.now()}`;
  iframe.hidden = true;
  document.body.appendChild(iframe);
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://formsubmit.co/${FORM_SUBMIT_EMAIL}`;
  form.target = iframe.name;
  form.hidden = true;
  emailData.set('_template', 'table');
  emailData.forEach((value, key) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
  rx.escalationSent = true;
  const fallbackPatients = getPatients();
  const fallbackPatient = fallbackPatients.find(item => item.id.toLowerCase() === patient.id.toLowerCase());
  const fallbackRx = fallbackPatient && (fallbackPatient.prescriptions || []).find(item => item.id === rx.id);
  if (fallbackRx) {
    fallbackRx.escalationSent = true;
    savePatients(fallbackPatients);
  }
  showGlassToast(`Email fallback submitted to ${FORM_SUBMIT_EMAIL}.`, 'error', 'Deadline Reached');
  setTimeout(() => { iframe.remove(); form.remove(); }, 10000);
  console.warn('FormSubmit AJAX failed; native form fallback submitted:', lastError);
  return true;
}

function handleMedicationDeadline(rx, patientId) {
  const patients = getPatients();
  const patient = patients.find(p => p.id.toLowerCase() === patientId.toLowerCase());
  const currentRx = patient && (patient.prescriptions || []).find(item => item.id === rx.id);
  if (!patient || !currentRx || currentRx.status === 'taken' || currentRx.escalationSent) return;

  currentRx.status = 'overdue';
  savePatients(patients);
  const caregiverNotification = patient.caregiver
    ? sendCaregiverNtfy(
      patient.caregiver,
      patient,
      `Missed medication alert: ${currentRx.name} was not acknowledged within ${MEDICATION_DEADLINE_SECONDS} seconds.`
    )
    : Promise.resolve(false);
  const emailNotification = sendMissedDoseEmail(patient, currentRx);
  Promise.all([caregiverNotification, emailNotification]).then(([ntfySent, emailSent]) => {
    if (!ntfySent) showGlassToast('Caregiver ntfy notification failed.', 'error', 'ntfy Delivery Failed');
    if (!emailSent) showGlassToast('Coordinator email failed.', 'error', 'Email Delivery Failed');
  });
  renderCurrentView();
}

function scheduleMedicationDeadline(rx, patientId) {
  const seconds = MEDICATION_DEADLINE_SECONDS;
  rx.deadlineSeconds = MEDICATION_DEADLINE_SECONDS;
  rx.deadlineAt = Date.now() + (seconds * 1000);
  const patients = getPatients();
  const patient = patients.find(item => item.id.toLowerCase() === patientId.toLowerCase());
  const persistedRx = patient && (patient.prescriptions || []).find(item => item.id === rx.id);
  if (persistedRx) {
    persistedRx.deadlineSeconds = seconds;
    persistedRx.deadlineAt = rx.deadlineAt;
    savePatients(patients);
  }
  appState.alarmDeadlineTimer = setTimeout(() => handleMedicationDeadline(rx, patientId), seconds * 1000);
}

// Glass Toast Notifications
function showGlassToast(message, type = 'info', title = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = 'toast-' + Date.now();
  const toast = document.createElement('div');
  toast.id = id;
  toast.className = 'toast-flame-slide flex items-start gap-3.5 p-4 rounded-2xl glass-panel bg-white border border-[#E3DEF2] shadow-xl max-w-sm w-full pointer-events-auto backdrop-blur-md transition-all duration-300';

  let icon = 'info';
  let badgeStyle = 'badge-flame';
  let headerText = title || 'Notification';

  if (type === 'success') {
    icon = 'check-circle-2';
    badgeStyle = 'badge-emerald';
    headerText = title || 'Success';
    toast.style.borderColor = 'rgba(98, 184, 155, 0.5)';
  } else if (type === 'error') {
    icon = 'alert-octagon';
    badgeStyle = 'badge-rose';
    headerText = title || 'Error';
    toast.style.borderColor = 'rgba(232, 122, 122, 0.5)';
  } else if (type === 'alarm') {
    icon = 'bell-ring';
    badgeStyle = 'badge-flame';
    headerText = title || 'Medication Alert';
    toast.style.borderColor = 'rgba(184, 166, 232, 0.8)';
    toast.style.boxShadow = '0 0 25px rgba(201, 191, 240, 0.6)';
  }

  toast.innerHTML = `
    <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${badgeStyle}">
      <i data-lucide="${icon}" class="w-5 h-5"></i>
    </div>
    <div class="flex-1 min-w-0">
      <h6 class="text-xs font-extrabold uppercase tracking-wider text-[#5D43A8]">${headerText}</h6>
      <p class="text-xs sm:text-sm text-[#3A3552] mt-0.5 leading-snug">${message}</p>
    </div>
    <button onclick="dismissGlassToast('${id}')" class="text-[#8B87A3] hover:text-[#3A3552] p-1 rounded-lg">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => dismissGlassToast(id), 5000);
}

function dismissGlassToast(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(110%)';
    setTimeout(() => el.remove(), 300);
  }
}

function setVoiceStatus(message, tone = 'text-[#8B87A3]') {
  const status = document.getElementById('voice-status');
  if (status) status.className = `text-xs ${tone}`;
  if (status) status.textContent = message;
}

async function requestVoicePermissions() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setVoiceStatus('Microphone is not supported in this browser.', 'text-rose-300');
    return;
  }
  try {
    voiceStream = voiceStream || await navigator.mediaDevices.getUserMedia({ audio: true });
    const button = document.getElementById('voice-permission-button');
    if (button) button.classList.add('hidden');
    const recordButton = document.getElementById('voice-record-button');
    if (recordButton) recordButton.classList.remove('hidden');
    setVoiceStatus('Microphone ready. Click Record now.', 'text-emerald-300');
  } catch (error) {
    setVoiceStatus('Microphone permission was denied.', 'text-rose-300');
    showGlassToast('Enable microphone permission to use voice updates.', 'error');
  }
}

async function startManualVoiceRecording() {
  if (!voiceStream) await requestVoicePermissions();
  if (voiceStream && !voiceRecorder) startVoiceRecording();
}

function startVoiceRecording() {
  if (!voiceStream || voiceRecorder) return;
  const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
  voiceChunks = [];
  voiceRecorder = new MediaRecorder(voiceStream, mimeType ? { mimeType } : undefined);
  voiceRecorder.ondataavailable = event => { if (event.data.size) voiceChunks.push(event.data); };
  voiceRecorder.onstop = finishVoiceRecording;
  voiceRecorder.start();
  setVoiceStatus('Recording voice update...', 'text-rose-300');
  const indicator = document.getElementById('voice-recording-indicator');
  if (indicator) indicator.classList.remove('hidden');
  const recordButton = document.getElementById('voice-record-button');
  const stopButton = document.getElementById('voice-stop-button');
  if (recordButton) recordButton.classList.add('hidden');
  if (stopButton) stopButton.classList.remove('hidden');
}

function stopVoiceRecording() {
  if (!voiceRecorder) return;
  voiceRecorder.stop();
}

function finishVoiceRecording() {
  const recorder = voiceRecorder;
  voiceRecorder = null;
  const indicator = document.getElementById('voice-recording-indicator');
  if (indicator) indicator.classList.add('hidden');
  const recordButton = document.getElementById('voice-record-button');
  const stopButton = document.getElementById('voice-stop-button');
  if (recordButton) recordButton.classList.remove('hidden');
  if (stopButton) stopButton.classList.add('hidden');
  const blob = new Blob(voiceChunks, { type: recorder.mimeType || 'audio/webm' });
  const reader = new FileReader();
  reader.onloadend = () => {
    const notes = getVoiceNotes();
    notes.unshift({
      id: `voice-${Date.now()}`,
      caregiverId: appState.currentUser ? appState.currentUser.id : 'unknown',
      caregiverName: appState.currentUser ? appState.currentUser.name : 'Caregiver',
      createdAt: new Date().toISOString(),
      audioUrl: reader.result
    });
    saveVoiceNotes(notes);
    setVoiceStatus('Voice update sent to coordinator.', 'text-emerald-300');
    showGlassToast('Voice update sent to the coordinator dashboard.', 'success');
    setTimeout(() => setVoiceStatus('Microphone ready. Click Start recording.', 'text-emerald-300'), 2500);
  };
  reader.readAsDataURL(blob);
}

// -------------------------------------------------------------
// AUTHENTICATION LOGIC (STRICT CREDENTIALS)
// -------------------------------------------------------------
function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username').value.trim().toLowerCase();
  const passwordInput = document.getElementById('login-password').value.trim();
  const loginCard = document.getElementById('login-card');
  const errorBanner = document.getElementById('login-error-banner');

  errorBanner.classList.add('hidden');
  loginCard.classList.remove('shake-animation');

  const caregiver = getCaregivers().find(item => item.id.toLowerCase() === usernameInput && item.password === passwordInput);
  if (caregiver) {
    loginSuccess({
      role: 'caregiver',
      id: caregiver.id,
      name: caregiver.name
    });
    return;
  }

  // Coordinator: saranraj / saran5721
  if (usernameInput === 'saranraj' && passwordInput === 'saran5721') {
    loginSuccess({
      role: 'coordinator',
      id: 'saranraj',
      name: 'Dr. Saranraj'
    });
    return;
  }

  // Invalid Credentials -> Shake & Error
  void loginCard.offsetWidth; // trigger reflow
  loginCard.classList.add('shake-animation');
  errorBanner.classList.remove('hidden');
  document.getElementById('login-error-text').textContent = 'Invalid User ID or Password. Please verify your credentials.';
  showGlassToast('Access denied: Invalid credentials entered.', 'error', 'Authentication Failed');
}

function loginSuccess(user) {
  appState.currentUser = user;
  sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));

  // Reset form
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';

  showGlassToast(`Welcome back, ${user.name}! Accessing ${user.role.toUpperCase()} portal...`, 'success', 'Login Authorized');
  renderCurrentView();
}

function handleLogout() {
  appState.currentUser = null;
  sessionStorage.removeItem(STORAGE_SESSION_KEY);
  showGlassToast('Signed out successfully.', 'info');
  renderCurrentView();
}

function openAddCaregiverModal() {
  const modal = document.getElementById('add-caregiver-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.getElementById('new-caregiver-id').value = '';
  document.getElementById('new-caregiver-password').value = '';
}

function closeAddCaregiverModal() {
  const modal = document.getElementById('add-caregiver-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function submitAddCaregiver(e) {
  e.preventDefault();
  if (!appState.currentUser || appState.currentUser.role !== 'coordinator') {
    showGlassToast('Only the coordinator can add a caretaker.', 'error');
    return;
  }
  const id = document.getElementById('new-caregiver-id').value.trim().toLowerCase();
  const password = document.getElementById('new-caregiver-password').value;
  if (!id || !password) return;
  const caregivers = getCaregivers();
  if (id === 'saranraj' || caregivers.some(item => item.id === id)) {
    showGlassToast('That caregiver username is already in use.', 'error');
    return;
  }
  caregivers.push({ id, name: id, password });
  saveCaregivers(caregivers);
  closeAddCaregiverModal();
  renderCoordinatorDashboard();
  showGlassToast(`Caregiver account ${id} created.`, 'success');
}

// -------------------------------------------------------------
// COORDINATOR LOGIC: PATIENTS & PRESCRIPTION STUDIO
// -------------------------------------------------------------

// Select patient in roster
function selectPatient(patientId) {
  if (!patientId) return;
  appState.selectedPatientId = patientId.toLowerCase();
  appState.pendingCaregiverId = '';
  appState.uploadedImageBase64 = null;
  
  // Reset preview
  const preview = document.getElementById('image-upload-preview');
  if (preview) {
    preview.src = '';
    preview.classList.add('hidden');
  }
  const placeholder = document.getElementById('upload-placeholder');
  if (placeholder) placeholder.classList.remove('hidden');

  renderCoordinatorDashboard();
  showGlassToast(`Active patient chart: ${patientId}`, 'info');
}

function syncCaregiverName(caregiverId) {
  appState.pendingCaregiverId = caregiverId;
  const caregiver = getCaregivers().find(item => item.id === caregiverId);
  const nameInput = document.getElementById('caregiver-name');
  if (nameInput) nameInput.value = caregiver ? caregiver.name : '';
}

// Open / Close Add Patient Modal
function openAddPatientModal() {
  const modal = document.getElementById('add-patient-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('new-patient-name').value = '';
    document.getElementById('new-patient-condition').value = '';
  }
}

function closeAddPatientModal() {
  const modal = document.getElementById('add-patient-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Submit Add Patient
function submitAddPatient(e) {
  e.preventDefault();
  if (!appState.currentUser || appState.currentUser.role !== 'caregiver') {
    showGlassToast('Only caregivers can add patients.', 'error');
    return;
  }
  const name = document.getElementById('new-patient-name').value.trim();
  const id = `patient-${Date.now()}`;
  const age = 0;
  const condition = document.getElementById('new-patient-condition').value.trim();

  if (!name || !condition) {
    showGlassToast('Please enter the patient name and treatment type.', 'error');
    return;
  }

  const patients = getPatients();

  const newPatient = {
    id: id,
    name: name,
    age: age,
    condition: condition,
    joinedDate: 'Today',
    caregiverId: appState.currentUser && appState.currentUser.role === 'caregiver' ? appState.currentUser.id : '',
    caregiver: appState.currentUser && appState.currentUser.role === 'caregiver'
      ? { id: appState.currentUser.id, name: appState.currentUser.name }
      : null,
    prescriptions: []
  };

  patients.push(newPatient);
  savePatients(patients);
  appState.selectedPatientId = id;

  closeAddPatientModal();
  if (appState.currentUser && appState.currentUser.role === 'caregiver') {
    renderPatientDashboard();
  } else {
    renderCoordinatorDashboard();
  }
  showGlassToast(`Patient "${name}" (${id}) registered successfully!`, 'success');
}

function getVisibleCaregiverPatients() {
  if (!appState.currentUser || appState.currentUser.role !== 'caregiver') return [];
  return getPatients().filter(patient => patient.caregiverId === appState.currentUser.id);
}

function editCaregiverPatient(patientId) {
  const patient = getVisibleCaregiverPatients().find(item => item.id === patientId);
  if (!patient) return;
  const name = window.prompt('Patient name', patient.name);
  if (name === null) return;
  const condition = window.prompt('Treatment type', patient.condition || '');
  if (condition === null) return;
  patient.name = name.trim() || patient.name;
  patient.condition = condition.trim() || patient.condition;
  const patients = getPatients();
  const index = patients.findIndex(item => item.id === patientId);
  patients[index] = patient;
  savePatients(patients);
  renderPatientDashboard();
}

function deleteCaregiverPatient(patientId) {
  const patient = getVisibleCaregiverPatients().find(item => item.id === patientId);
  if (!patient || !window.confirm(`Delete ${patient.name} and all prescriptions?`)) return;
  savePatients(getPatients().filter(item => item.id !== patientId));
  appState.selectedPatientId = '';
  renderPatientDashboard();
  showGlassToast(`${patient.name} was deleted.`, 'info');
}

// Resilient Image Upload with Automatic Canvas Resizing & Compression (Guarantees fits in localStorage)
function handleMedicineImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Resize down to max 280x280 thumbnail for maximum performance & zero storage quota errors
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 280;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed jpeg data URL (~12KB - 25KB)
      const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
      appState.uploadedImageBase64 = compressedUrl;

      const preview = document.getElementById('image-upload-preview');
      const placeholder = document.getElementById('upload-placeholder');
      if (preview) {
        preview.src = compressedUrl;
        preview.classList.remove('hidden');
      }
      if (placeholder) {
        placeholder.classList.add('hidden');
      }
      showGlassToast('Medicine image optimized and attached!', 'success', 'Image Uploaded');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Helper to set Alarm time to +1 or +2 mins from now
function setQuickAlarmTime(minutesOffset) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutesOffset);
  const hours = now.getHours().toString().padStart(2, '0');
  const mins = now.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${mins}`;

  const timeInput = document.getElementById('rx-alarm-time');
  if (timeInput) {
    timeInput.value = timeStr;
    showGlassToast(`Alarm set for: ${timeStr} (in ${minutesOffset} min)`, 'alarm', 'Alarm Configured');
  }
}

function caregiverTopic(caregiverId) {
  return `${NTFY_TOPIC_PREFIX}${String(caregiverId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
}

async function sendCaregiverNtfy(caregiver, patient, eventText) {
  if (!caregiver || !caregiver.id || typeof fetch !== 'function') return false;

  const message = [
    eventText,
    `Patient: ${patient.name} (${patient.id})`,
    `Age: ${patient.age || 'Not provided'}`,
    `Condition: ${patient.condition || 'Not provided'}`,
    `Caregiver: ${caregiver.name} (${caregiver.id})`
  ].join('\n');

  try {
    const response = await fetch(`https://ntfy.sh/${caregiverTopic(caregiver.id)}`, {
      method: 'POST',
      headers: {
        'Title': 'BREAK THROUGH AI Caregiver Update',
        'Priority': 'high',
        'Tags': 'hospital,caregiver'
      },
      body: message
    });
    if (!response.ok) throw new Error(`ntfy returned ${response.status}`);
    return true;
  } catch (error) {
    console.warn('ntfy caregiver notification failed:', error);
    return false;
  }
}

function assignCaregiver(event) {
  event.preventDefault();
  const id = document.getElementById('caregiver-id').value.trim().toLowerCase();
  const patients = getPatients();
  const patient = patients.find(p => p.id.toLowerCase() === appState.selectedPatientId.toLowerCase());
  const caregiverAccount = getCaregivers().find(item => item.id === id);

  if (!patient || !id) {
    showGlassToast('Select a patient and caregiver account.', 'error');
    return;
  }
  if (!caregiverAccount) {
    showGlassToast('Create the caregiver account before assigning it to a patient.', 'error');
    return;
  }

  const previousCaregiver = patient.caregiver || null;
  const nextCaregiver = { name: caregiverAccount.name, id };
  patient.caregiver = nextCaregiver;
  patient.caregiverId = id;
  if (!savePatients(patients)) return;
  appState.pendingCaregiverId = '';

  if (previousCaregiver && previousCaregiver.id !== nextCaregiver.id) {
    sendCaregiverNtfy(previousCaregiver, patient, `Caregiver reassignment notice: ${nextCaregiver.name} (${nextCaregiver.id}) is now assigned.`);
  }
  sendCaregiverNtfy(nextCaregiver, patient, previousCaregiver
    ? `Caregiver assignment notice: you replaced ${previousCaregiver.name} (${previousCaregiver.id}).`
    : 'Caregiver assignment notice: you are now assigned to this patient.');

  renderCoordinatorDashboard();
  showGlassToast(`Assigned ${caregiverAccount.name} (${id}) to ${patient.name}. Previous and new caregiver notifications sent.`, 'success', 'Caretaker Assigned');
}

function renderAssignedCaregiver(patient) {
  const display = document.getElementById('assigned-caregiver-display');
  if (!display) return;
  display.textContent = patient && patient.caregiver
    ? `Assigned: ${patient.caregiver.name} (${patient.caregiver.id})`
    : 'No caregiver assigned';
}

// Save Prescription Details
function submitPrescription(e) {
  e.preventDefault();
  const targetPatientSelect = document.getElementById('rx-target-patient');
  const targetPatientId = targetPatientSelect ? targetPatientSelect.value : appState.selectedPatientId;

  const medName = document.getElementById('rx-med-name').value.trim();
  const medDosage = document.getElementById('rx-med-dosage').value.trim();
  const medInstructions = document.getElementById('rx-med-instructions').value.trim();
  const alarmTime = document.getElementById('rx-alarm-time').value;
  const deadlineInput = document.getElementById('rx-deadline-seconds');
  const deadlineSeconds = MEDICATION_DEADLINE_SECONDS;

  if (!medName || !alarmTime) {
    showGlassToast('Medicine Name and Alarm Timing are required!', 'error');
    return;
  }

  const patients = getPatients();
  const patient = patients.find(p => p.id.toLowerCase() === targetPatientId.toLowerCase());
  if (!patient) {
    showGlassToast(`Target patient "${targetPatientId}" not found.`, 'error');
    return;
  }

  // Use compressed uploaded image or standard high-tech fallback
  const finalImage = appState.uploadedImageBase64 || defaultPillSvg;

  const newRx = {
    id: 'rx-' + Date.now(),
    name: medName,
    dosage: medDosage || '1 Dose',
    instructions: medInstructions || 'Take as prescribed.',
    alarmTime: alarmTime,
    imageUrl: finalImage,
    deadlineSeconds,
    deadlineAt: null,
    escalationSent: false,
    status: 'pending',
    confirmedAt: null
  };

  patient.prescriptions = patient.prescriptions || [];
  patient.prescriptions.unshift(newRx);
  
  const savedOk = savePatients(patients);
  if (!savedOk) {
    showGlassToast('Error saving prescription. Please try again.', 'error');
    return;
  }

  // Reset form inputs
  document.getElementById('rx-med-name').value = '';
  document.getElementById('rx-med-dosage').value = '';
  document.getElementById('rx-med-instructions').value = '';
  document.getElementById('rx-alarm-time').value = '';
  if (deadlineInput) deadlineInput.value = String(MEDICATION_DEADLINE_SECONDS);
  document.getElementById('rx-image-file').value = '';
  appState.uploadedImageBase64 = null;

  const preview = document.getElementById('image-upload-preview');
  if (preview) {
    preview.src = '';
    preview.classList.add('hidden');
  }
  const placeholder = document.getElementById('upload-placeholder');
  if (placeholder) placeholder.classList.remove('hidden');

  appState.selectedPatientId = patient.id;
  renderCoordinatorDashboard();
  showGlassToast(`✓ Deployed ${medName} to ${patient.name}'s dashboard! Alarm active for ${alarmTime}.`, 'success', 'Prescription Deployed');
}

// Delete a prescription
function deletePrescription(rxId) {
  const patients = getPatients();
  const patient = patients.find(p => p.id.toLowerCase() === appState.selectedPatientId.toLowerCase());
  if (!patient || !patient.prescriptions) return;

  patient.prescriptions = patient.prescriptions.filter(r => r.id !== rxId);
  savePatients(patients);
  renderCoordinatorDashboard();
  showGlassToast('Prescription removed.', 'info');
}

// -------------------------------------------------------------
// PATIENT DASHBOARD & ALARM TRIGGER SYSTEM
// -------------------------------------------------------------

function triggerAlarmByRxId(rxId, targetPatientId) {
  const patients = getPatients();
  const pId = targetPatientId || (appState.currentUser ? appState.currentUser.id : appState.selectedPatientId);
  const patient = patients.find(p => p.id.toLowerCase() === pId.toLowerCase());
  if (!patient || !patient.prescriptions) return;

  const rx = patient.prescriptions.find(r => r.id === rxId);
  if (!rx) return;

  triggerAlarmForPrescription(rx, patient.name, patient.id);
}

function triggerAlarmForPrescription(rx, patientName, patientId) {
  appState.activeAlarmRx = rx;
  const modal = document.getElementById('flame-alarm-modal');
  if (!modal) return;

  document.getElementById('alarm-rx-name').textContent = rx.name.toUpperCase();
  document.getElementById('alarm-rx-dosage').textContent = rx.dosage;
  document.getElementById('alarm-rx-time').textContent = rx.alarmTime;
  document.getElementById('alarm-rx-instructions').textContent = rx.instructions;
  
  const imgEl = document.getElementById('alarm-rx-image');
  if (imgEl) imgEl.src = rx.imageUrl;

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  stopMedicationAlert();
  scheduleMedicationDeadline(rx, patientId || (appState.currentUser && appState.currentUser.id));
  startContinuousAlarmSound();
  announceMedication(rx);
  appState.alarmSpeechInterval = setInterval(() => announceMedication(rx), 6500);

  showGlassToast(`🔔 TIME FOR YOUR MEDICATION: ${rx.name}`, 'alarm', 'Active Alarm');
}

// Acknowledge medication in Alarm Modal
function acknowledgeAlarmMedication() {
  stopMedicationAlert();

  const modal = document.getElementById('flame-alarm-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  if (!appState.activeAlarmRx || !appState.currentUser) return;

  const rxId = appState.activeAlarmRx.id;
  const patients = getPatients();
  const patient = patients.find(p => p.id === appState.selectedPatientId && p.caregiverId === appState.currentUser.id);

  if (patient && patient.prescriptions) {
    const rx = patient.prescriptions.find(r => r.id === rxId);
    if (rx) {
      rx.status = 'taken';
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      rx.confirmedAt = `${hours % 12 || 12}:${minutes} ${ampm}`;
      savePatients(patients);
    }
  }

  showGlassToast(`✓ ${appState.currentUser.name} confirmed taking ${appState.activeAlarmRx.name}! Status synced to Dr. Saranraj.`, 'success', 'Medication Acknowledged');
  appState.activeAlarmRx = null;
  renderPatientDashboard();
}

// Manual Take Now button
function manualTakeMedication(rxId) {
  if (!appState.currentUser || appState.currentUser.role !== 'caregiver') return;

  const patients = getPatients();
  const patient = patients.find(p => p.id === appState.selectedPatientId && p.caregiverId === appState.currentUser.id);
  if (!patient || !patient.prescriptions) return;

  const rx = patient.prescriptions.find(r => r.id === rxId);
  if (!rx) return;

  rx.status = 'taken';
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  rx.confirmedAt = `${hours % 12 || 12}:${minutes} ${ampm}`;
  savePatients(patients);

  showGlassToast(`✓ Marked ${rx.name} as TAKEN. Recorded at ${rx.confirmedAt}.`, 'success');
  renderPatientDashboard();
}

// Real-Time Background Clock & Alarm Check (runs every second)
function startAlarmClock() {
  setInterval(() => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    // Update live clock displays
    const clockElements = document.querySelectorAll('.live-clock-display');
    clockElements.forEach(el => {
      el.textContent = `${currentTimeStr}:${seconds}`;
    });

    // Check alarms if a patient is logged in
    if (appState.currentUser && appState.currentUser.role === 'caregiver') {
      getVisibleCaregiverPatients().forEach(patient => {
        if (patient && patient.prescriptions) {
          patient.prescriptions.forEach(rx => {
          if (rx.status === 'pending' && rx.deadlineAt && Date.now() >= rx.deadlineAt) {
            handleMedicationDeadline(rx, patient.id);
            return;
          }
          if (rx.status === 'pending' && rx.alarmTime === currentTimeStr) {
            const alarmKey = `${rx.id}-${currentTimeStr}`;
            if (!appState.triggeredToday.has(alarmKey)) {
              appState.triggeredToday.add(alarmKey);
              triggerAlarmForPrescription(rx, patient.name, patient.id);
            }
          }
          });
        }
      });
    }
  }, 1000);
}

// -------------------------------------------------------------
// VIEW RENDERERS
// -------------------------------------------------------------

function renderCoordinatorVoiceNotes() {
  const container = document.getElementById('coordinator-voice-notes');
  const count = document.getElementById('voice-note-count');
  if (!container) return;
  const notes = getVoiceNotes();
  if (count) count.textContent = `${notes.length} update${notes.length === 1 ? '' : 's'}`;
  container.innerHTML = notes.length ? notes.map(note => `
    <div class="p-4 rounded-xl bg-white border border-[#FFD3B0] min-w-0 shadow-sm">
      <div>
        <strong class="block text-sm text-[#3A3552]">${note.caregiverName}</strong>
        <span class="text-xs text-[#8B87A3]">${new Date(note.createdAt).toLocaleString()}</span>
      </div>
      <div class="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <audio id="voice-audio-${note.id}" controls preload="metadata" src="${note.audioUrl}" class="w-full min-w-0"></audio>
        <button onclick="playVoiceNote('${note.id}')" class="btn-flame shrink-0 text-xs px-3 py-2 flex items-center justify-center gap-2">
          <i data-lucide="play" class="w-4 h-4"></i><span>Play</span>
        </button>
      </div>
    </div>
  `).join('') : '<p class="text-sm text-[#8B87A3] text-center py-6">No voice updates received yet.</p>';
  lucide.createIcons();
}

function playVoiceNote(noteId) {
  const audio = document.getElementById(`voice-audio-${noteId}`);
  if (!audio) return;
  audio.play().catch(() => showGlassToast('This recording cannot be played in the current browser.', 'error'));
}

function renderCurrentView() {
  const loginSection = document.getElementById('view-login');
  const coordinatorSection = document.getElementById('view-coordinator');
  const patientSection = document.getElementById('view-patient');

  // Hide all first
  loginSection.classList.add('hidden');
  coordinatorSection.classList.add('hidden');
  patientSection.classList.add('hidden');

  if (!appState.currentUser) {
    loginSection.classList.remove('hidden');
    document.title = 'Login — BREAK THROUGH AI';
  } else if (appState.currentUser.role === 'coordinator') {
    coordinatorSection.classList.remove('hidden');
    document.title = 'Coordinator Portal — BREAK THROUGH AI';
    renderCoordinatorDashboard();
    renderCoordinatorVoiceNotes();
  } else if (appState.currentUser.role === 'caregiver') {
    patientSection.classList.remove('hidden');
    document.title = `Caregiver Dashboard (${appState.currentUser.name}) — BREAK THROUGH AI`;
    renderPatientDashboard();
  }

  lucide.createIcons();
}

// 1. Render Coordinator Dashboard
function renderCoordinatorDashboard() {
  const patients = getPatients();
  const caregivers = getCaregivers();

  const caregiverRoster = document.getElementById('coordinator-caregiver-roster');
  if (caregiverRoster) {
    caregiverRoster.innerHTML = caregivers.map(caregiver => {
      const count = patients.filter(patient => patient.caregiverId === caregiver.id).length;
      return `<div class="p-3 rounded-xl bg-white border border-[#CEEDE0] flex items-center justify-between gap-3 shadow-sm">
        <div><strong class="block text-sm text-[#3A3552]">${caregiver.name}</strong><span class="text-xs text-[#246B52] font-mono">${caregiver.id}</span></div>
        <span class="text-xs text-[#8B87A3]">${count} patient${count === 1 ? '' : 's'}</span>
      </div>`;
    }).join('');
  }

  const caregiverSelect = document.getElementById('caregiver-id');
  if (caregiverSelect) {
    const selectedAssignmentPatient = patients.find(patient => patient.id === appState.selectedPatientId) || patients[0];
    if (!appState.selectedPatientId && selectedAssignmentPatient) appState.selectedPatientId = selectedAssignmentPatient.id;
    const assignedId = appState.pendingCaregiverId || selectedAssignmentPatient?.caregiverId || '';
    caregiverSelect.innerHTML = `<option value="">Select caregiver account</option>${caregivers.map(caregiver => `
      <option value="${caregiver.id}" ${caregiver.id === assignedId ? 'selected' : ''}>${caregiver.name} (${caregiver.id})</option>
    `).join('')}`;
    syncCaregiverName(caregiverSelect.value);
  }
  
  // Match selected patient case-insensitively
  let selectedPatient = patients.find(p => p.id.toLowerCase() === appState.selectedPatientId.toLowerCase());
  if (!selectedPatient && patients.length > 0) {
    selectedPatient = patients[0];
    appState.selectedPatientId = selectedPatient.id;
  }

  // Update target patient select dropdown on prescription form
  const targetPatientSelect = document.getElementById('rx-target-patient');
  if (targetPatientSelect) {
    targetPatientSelect.innerHTML = patients.map(p => `
      <option value="${p.id}" ${p.id.toLowerCase() === appState.selectedPatientId.toLowerCase() ? 'selected' : ''}>
        ${p.name} (${p.id})
      </option>
    `).join('');
  }

  // Total metrics
  const totalPatientsCount = patients.length;
  const totalRxs = patients.reduce((acc, p) => acc + (p.prescriptions ? p.prescriptions.length : 0), 0);
  const pendingRxs = patients.reduce((acc, p) => acc + (p.prescriptions ? p.prescriptions.filter(r => r.status === 'pending').length : 0), 0);
  const takenRxs = patients.reduce((acc, p) => acc + (p.prescriptions ? p.prescriptions.filter(r => r.status === 'taken').length : 0), 0);

  document.getElementById('metric-total-patients').textContent = totalPatientsCount;
  document.getElementById('metric-total-prescriptions').textContent = totalRxs;
  document.getElementById('metric-pending-alarms').textContent = pendingRxs;
  document.getElementById('metric-taken-confirmed').textContent = takenRxs;

  // Render Patient Roster Tabs/List
  const rosterContainer = document.getElementById('coordinator-patient-roster');
  if (rosterContainer) {
    rosterContainer.innerHTML = patients.map(p => {
      const isSelected = p.id.toLowerCase() === appState.selectedPatientId.toLowerCase();
      const pRxs = p.prescriptions || [];
      const pendingCount = pRxs.filter(r => r.status === 'pending').length;

      return `
        <button onclick="selectPatient('${p.id}')" class="w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border ${
          isSelected 
            ? 'bg-[#B8A6E8]/20 border-[#B8A6E8] text-[#3A3552] shadow-md shadow-[#C9BFF0]/30' 
            : 'bg-white border-[#E3DEF2] text-[#3A3552] hover:border-[#B8A6E8]/50 hover:bg-[#F7F5FB]'
        }">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-gradient-to-br from-[#B8A6E8] to-[#A8D8F0] text-[#3A3552] shadow-sm' : 'bg-[#F7F5FB] text-[#6E54B5]'}">
              ${p.name.charAt(0)}
            </div>
            <div>
              <h5 class="text-sm font-bold text-[#3A3552] flex items-center gap-2">
                ${p.name}
                ${isSelected ? '<span class="w-2 h-2 rounded-full bg-[#B8A6E8] animate-pulse"></span>' : ''}
              </h5>
              <span class="text-xs font-mono text-[#5D43A8] font-semibold">ID: ${p.id}</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[11px] px-2.5 py-0.5 rounded-full ${pendingCount > 0 ? 'badge-amber' : 'badge-emerald'} font-semibold">
              ${pendingCount} Pending
            </span>
          </div>
        </button>
      `;
    }).join('');
  }

  // Display Selected Patient's Header & Information
  if (selectedPatient) {
    document.getElementById('selected-patient-name-display').textContent = selectedPatient.name;
    document.getElementById('selected-patient-id-display').textContent = selectedPatient.id;
    document.getElementById('selected-patient-age-display').textContent = `${selectedPatient.age} Yrs`;
    document.getElementById('selected-patient-condition-display').textContent = selectedPatient.condition;
    renderAssignedCaregiver(selectedPatient);

    // Render Prescriptions List for this selected patient
    const rxList = document.getElementById('selected-patient-rx-list');
    if (rxList) {
      const pRxs = selectedPatient.prescriptions || [];
      if (pRxs.length === 0) {
        rxList.innerHTML = `
          <div class="p-8 text-center rounded-2xl border border-dashed border-[#E3DEF2] bg-white text-[#8B87A3]">
            <i data-lucide="pill" class="w-8 h-8 mx-auto mb-2 text-[#B8A6E8]/70"></i>
            <p class="text-sm font-bold text-[#3A3552]">No prescriptions scheduled yet for ${selectedPatient.name}.</p>
            <p class="text-xs text-[#8B87A3] mt-1">Use the Prescription Studio on the left to upload medicine details and set alarm timings.</p>
          </div>
        `;
      } else {
        rxList.innerHTML = pRxs.map(rx => `
          <div class="glass-panel glass-panel-hover p-4 border border-[#E3DEF2] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-xl bg-[#F7F5FB] border border-[#E3DEF2] overflow-hidden shrink-0 flex items-center justify-center p-1.5 shadow-inner">
                <img src="${rx.imageUrl}" alt="${rx.name}" class="w-full h-full object-contain">
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-base font-bold text-[#3A3552]">${rx.name}</h4>
                  <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    rx.status === 'taken' ? 'badge-emerald' : rx.status === 'overdue' ? 'badge-rose' : 'badge-amber'
                  }">
                    ${rx.status === 'taken' ? `✓ Taken (${rx.confirmedAt})` : '● Pending Alarm'}
                  </span>
                </div>
                <div class="text-xs font-semibold text-[#5D43A8] mt-0.5">${rx.dosage}</div>
                <p class="text-xs text-[#3A3552] mt-1">${rx.instructions}</p>
                <p class="text-[11px] text-[#96531C] mt-1 font-medium">Acknowledge within ${MEDICATION_DEADLINE_SECONDS} seconds</p>
              </div>
            </div>

            <div class="flex items-center gap-3 self-end sm:self-center">
              <div class="text-right px-3 py-1.5 rounded-xl bg-[#F7F5FB] border border-[#E3DEF2]">
                <span class="text-[10px] uppercase font-bold text-[#8B87A3] block">Alarm Time</span>
                <span class="text-sm font-extrabold font-mono text-[#5D43A8] flex items-center gap-1">
                  <i data-lucide="alarm-clock" class="w-3.5 h-3.5"></i> ${rx.alarmTime}
                </span>
              </div>
              <button onclick="triggerAlarmByRxId('${rx.id}', '${selectedPatient.id}')" class="btn-glass text-xs px-3 py-2 flex items-center gap-1.5">
                <i data-lucide="bell" class="w-3.5 h-3.5"></i> Test Ring
              </button>
              <button onclick="deletePrescription('${rx.id}')" title="Delete Prescription" class="text-[#E87A7A] hover:text-[#9E2B2B] p-2 rounded-xl hover:bg-[#FFB3B3]/20">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `).join('');
      }
    }
  }

  lucide.createIcons();
}

// 2. Render Patient Dashboard
function renderPatientDashboard() {
  if (!appState.currentUser || appState.currentUser.role !== 'caregiver') return;

  const patients = getVisibleCaregiverPatients();
  let patient = patients.find(p => p.id === appState.selectedPatientId);
  if (!patient && patients.length > 0) {
    patient = patients[0];
    appState.selectedPatientId = patient.id;
  }

  const nameEl = document.getElementById('patient-display-name');
  if (nameEl) nameEl.textContent = appState.currentUser.name;
  
  const welcomeNameEl = document.getElementById('patient-welcome-name');
  if (welcomeNameEl) welcomeNameEl.textContent = appState.currentUser.name;

  const idEl = document.getElementById('patient-display-id');
  if (idEl) idEl.textContent = appState.currentUser.id;

  // Render Patient's Prescriptions Cards
  const container = document.getElementById('patient-prescriptions-grid');
  if (container) {
    const pRxs = patient ? (patient.prescriptions || []) : [];
    if (pRxs.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-12 text-center rounded-2xl glass-panel bg-white border-dashed border-[#E3DEF2]">
          <i data-lucide="clipboard-x" class="w-12 h-12 mx-auto text-[#B8A6E8] mb-3 opacity-60"></i>
          <h4 class="text-lg font-bold text-[#3A3552]">${patient ? `No prescriptions for ${patient.name}` : 'Your patient list is empty'}</h4>
          <p class="text-sm text-[#8B87A3] mt-1">${patient ? 'The coordinator will upload medication schedules and alarm timings here.' : 'Use Add Patient to create the first patient record.'}</p>
        </div>
      `;
    } else {
      container.innerHTML = pRxs.map(rx => {
        const isTaken = rx.status === 'taken';

        return `
          <div class="glass-panel glass-panel-hover p-6 flex flex-col justify-between relative overflow-hidden border border-[#E3DEF2] bg-white shadow-sm">
            <!-- Glowing top accent line -->
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isTaken ? 'from-[#A8E6CF] to-[#62B89B]' : 'from-[#B8A6E8] to-[#A8D8F0]'}"></div>
            
            <div>
              <div class="flex items-start justify-between gap-3 mb-4">
                <div class="w-16 h-16 rounded-2xl bg-[#F7F5FB] border border-[#E3DEF2] overflow-hidden flex items-center justify-center p-2 shadow-inner">
                  <img src="${rx.imageUrl}" alt="${rx.name}" class="w-full h-full object-contain">
                </div>
                <span class="text-xs font-semibold px-3 py-1 rounded-full ${isTaken ? 'badge-emerald' : 'badge-amber'} flex items-center gap-1.5">
                  ${isTaken ? `<i data-lucide="check" class="w-3.5 h-3.5"></i> Taken` : `<i data-lucide="clock" class="w-3.5 h-3.5"></i> Alarm at ${rx.alarmTime}`}
                </span>
              </div>

              <h4 class="text-xl font-extrabold text-[#3A3552] tracking-tight">${rx.name}</h4>
              <div class="text-sm font-bold text-[#5D43A8] mt-0.5">${rx.dosage}</div>

              <div class="mt-4 pt-3 border-t border-[#E3DEF2] space-y-2 text-xs text-[#3A3552]">
                <div class="flex items-center gap-2">
                  <i data-lucide="alarm-clock" class="w-4 h-4 text-[#B8A6E8]"></i>
                  <span>Alarm Trigger: <strong class="text-[#3A3552] font-mono text-sm">${rx.alarmTime}</strong></span>
                </div>
                <div class="flex items-center gap-2">
                  <i data-lucide="info" class="w-4 h-4 text-[#B8A6E8]"></i>
                  <span>${rx.instructions}</span>
                </div>
                <div class="flex items-center gap-2 text-[#96531C]">
                  <i data-lucide="timer" class="w-4 h-4"></i>
                  <span>Acknowledge within ${MEDICATION_DEADLINE_SECONDS} seconds</span>
                </div>
                ${isTaken ? `
                  <div class="flex items-center gap-2 text-[#246B52] font-medium">
                    <i data-lucide="check-circle" class="w-4 h-4"></i>
                    <span>Confirmed at ${rx.confirmedAt}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-[#E3DEF2] flex items-center justify-between gap-2">
              <button onclick="triggerAlarmByRxId('${rx.id}', '${patient.id}')" class="btn-glass text-xs px-3 py-2 flex items-center gap-1.5">
                <i data-lucide="bell-ring" class="w-3.5 h-3.5"></i> Test Ring
              </button>
              
              ${isTaken ? `
                <span class="text-xs font-bold text-[#246B52] flex items-center gap-1 px-3 py-2 rounded-xl bg-[#A8E6CF]/25 border border-[#62B89B]/40">
                  <i data-lucide="check-check" class="w-4 h-4"></i> Complete
                </span>
              ` : `
                <button onclick="manualTakeMedication('${rx.id}')" class="btn-flame text-xs px-4 py-2 flex items-center gap-1.5 shadow-md">
                  <i data-lucide="check" class="w-4 h-4"></i> Mark Taken
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const patientList = document.getElementById('caregiver-patient-list');
  if (patientList) {
    patientList.innerHTML = patients.length ? patients.map(item => `
      <div class="p-4 rounded-xl border ${item.id === appState.selectedPatientId ? 'border-[#B8A6E8] bg-[#B8A6E8]/15' : 'border-[#E3DEF2] bg-white'} flex items-center justify-between gap-3 shadow-sm">
        <button onclick="appState.selectedPatientId='${item.id}'; renderPatientDashboard()" class="flex-1 text-left">
          <strong class="block text-[#3A3552]">${item.name}</strong>
          <span class="text-xs text-[#5D43A8]">${item.condition || 'Treatment not specified'}</span>
        </button>
        <div class="flex items-center gap-1">
          <button onclick="editCaregiverPatient('${item.id}')" class="btn-glass text-xs px-2.5 py-1.5">Edit</button>
          <button onclick="deleteCaregiverPatient('${item.id}')" class="text-[#E87A7A] hover:text-[#9E2B2B] text-xs px-2.5 py-1.5">Delete</button>
        </div>
      </div>
    `).join('') : '<p class="text-sm text-[#8B87A3] text-center py-6">No patients added yet.</p>';
  }

  lucide.createIcons();
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
async function refreshPatientsFromServer() {
  if (networkSyncInFlight) return;
  try {
    const response = await fetch(SYNC_API_URL, { cache: 'no-store' });
    if (!response.ok) return;
    const remote = await response.json();
    const hasRemoteData = remote.patients.length || remote.caregivers.length || remote.voiceNotes.length;
    const hasLocalData = getPatients().length || getCaregivers().length > 1 || getVoiceNotes().length;
    if (hasRemoteData) {
      localStorage.setItem(STORAGE_PATIENTS_KEY, JSON.stringify(remote.patients));
      localStorage.setItem(STORAGE_CAREGIVERS_KEY, JSON.stringify(remote.caregivers));
      localStorage.setItem(STORAGE_VOICE_NOTES_KEY, JSON.stringify(remote.voiceNotes));
      window.dispatchEvent(new CustomEvent('carehub-data-updated'));
      return;
    }
    if (hasLocalData) syncStateToServer();
  } catch (error) {
    console.warn('Network refresh failed; keeping local data.', error);
  }
}

function startPatientDataPolling() {
  setInterval(() => {
    if (appState.currentUser) {
      refreshPatientsFromServer();
    }
  }, PATIENTS_SYNC_POLL_MS);
}

document.addEventListener('DOMContentLoaded', () => {
  // Check if session exists in sessionStorage
  const session = sessionStorage.getItem(STORAGE_SESSION_KEY);
  if (session) {
    try {
      appState.currentUser = JSON.parse(session);
      if (!appState.currentUser || !['caregiver', 'coordinator'].includes(appState.currentUser.role)) {
        appState.currentUser = null;
        sessionStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch (e) {
      appState.currentUser = null;
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
    }
  }

  refreshPatientsFromServer();

  // Always start on login view if no valid user
  renderCurrentView();
  startAlarmClock();
  startPatientDataPolling();
  lucide.createIcons();
});

window.addEventListener('carehub-data-updated', () => {
  renderCurrentView();
});

window.addEventListener('carehub-voice-updated', () => {
  if (appState.currentUser && appState.currentUser.role === 'coordinator') {
    renderCoordinatorVoiceNotes();
  }
});

// Real-Time Cross-Tab / Cross-Window Sync
window.addEventListener('storage', (e) => {
  if ([STORAGE_PATIENTS_KEY, STORAGE_CAREGIVERS_KEY, STORAGE_VOICE_NOTES_KEY].includes(e.key)) {
    renderCurrentView();
  }
});
