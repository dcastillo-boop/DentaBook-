/* ============================================================
   DentaBook — Mock Data 
   ============================================================ */


/* ------------------------------------------------------------
   CLINICS
------------------------------------------------------------ */
const CLINICS = [
  {
    id: 'clinic-1',
    name: 'BrightSmile Dental Clinic',
    address: '123 Aurora Blvd, Quezon City',
    phone: '+63 917 100 1001',
    hours: 'Mon–Sat · 9:00 AM – 7:00 PM',
    status: 'active',
  },
  {
    id: 'clinic-2',
    name: 'Pearl Dental Center',
    address: '456 Ayala Ave, Makati City',
    phone: '+63 917 200 2002',
    hours: 'Mon–Sat · 8:00 AM – 6:00 PM',
    status: 'active',
  },
  {
    id: 'clinic-3',
    name: 'SmileCraft Dental Studio',
    address: '789 Ortigas Ave, Pasig City',
    phone: '+63 917 300 3003',
    hours: 'Tue–Sun · 10:00 AM – 8:00 PM',
    status: 'active',
  },
];


/* ------------------------------------------------------------
   SERVICES
------------------------------------------------------------ */
const SERVICES = [
  { id: 'svc-1', clinicId: 'clinic-1', name: 'Dental Cleaning',     duration: 30, price: 800,  icon: '', description: 'Routine cleaning and plaque removal.' },
  { id: 'svc-2', clinicId: 'clinic-1', name: 'Tooth Extraction',    duration: 45, price: 1200, icon: '', description: 'Safe removal of damaged or impacted teeth.' },
  { id: 'svc-3', clinicId: 'clinic-2', name: 'Braces Consultation', duration: 30, price: 500,  icon: '', description: 'Assessment and plan for orthodontic treatment.' },
  { id: 'svc-4', clinicId: 'clinic-2', name: 'Teeth Whitening',     duration: 60, price: 3500, icon: '', description: 'Professional whitening for a brighter smile.' },
  { id: 'svc-5', clinicId: 'clinic-3', name: 'Root Canal',          duration: 90, price: 5000, icon: '', description: 'Treatment for infected or damaged tooth pulp.' },
  { id: 'svc-6', clinicId: 'clinic-3', name: 'Pediatric Checkup',   duration: 30, price: 600,  icon: '', description: 'Gentle dental care for kids and teens.' },
];


/* ------------------------------------------------------------
   DENTISTS
------------------------------------------------------------ */
const DENTISTS = [
  { id: 'den-1', name: 'Dr. Sofia Mendoza', specialty: 'Orthodontist',        clinics: ['clinic-1', 'clinic-2'], bio: '10+ years of braces and aligner experience.' },
  { id: 'den-2', name: 'Dr. Rafael Cruz',   specialty: 'General Dentistry',   clinics: ['clinic-1', 'clinic-3'], bio: 'Focuses on preventive and family dental care.' },
  { id: 'den-3', name: 'Dr. Isabella Tan',  specialty: 'Oral Surgery',        clinics: ['clinic-2'],             bio: 'Specialist in extractions and minor surgeries.' },
  { id: 'den-4', name: 'Dr. Miguel Santos', specialty: 'Pediatric Dentistry', clinics: ['clinic-3'],             bio: 'Loves making dental visits fun for kids.' },
];


/* ------------------------------------------------------------
   STAFF
------------------------------------------------------------ */
const STAFF = [
  { id: 'staff-1', name: 'Angela Reyes',    role: 'Clinic Manager', clinicId: 'clinic-1', email: 'angela@brightsmile.ph' },
  { id: 'staff-2', name: 'Mark Villanueva', role: 'Receptionist',   clinicId: 'clinic-2', email: 'mark@pearldental.ph' },
  { id: 'staff-3', name: 'Sarah Lim',       role: 'Clinic Manager', clinicId: 'clinic-3', email: 'sarah@smilecraft.ph' },
];


/* ------------------------------------------------------------
   PATIENTS
------------------------------------------------------------ */
const PATIENTS = [
  { id: 'pat-1', name: 'Kris Eduria',      email: 'kris.eduria@example.com',      phone: '+63 917 111 1111', verified: true  },
  { id: 'pat-2', name: 'Nathaniel Grate',  email: 'nathaniel.grate@example.com',  phone: '+63 917 222 2222', verified: true  },
  { id: 'pat-3', name: 'Dorin Castillo',   email: 'dorin.castillo@example.com',   phone: '+63 917 333 3333', verified: true  },
  { id: 'pat-4', name: 'Maria Santos',     email: 'maria.santos@example.com',     phone: '+63 917 444 4444', verified: true  },
  { id: 'pat-5', name: 'Juan Dela Cruz',   email: 'juan.delacruz@example.com',    phone: '+63 917 555 5555', verified: false },
];


/* ------------------------------------------------------------
   APPOINTMENTS
   Status: pending | confirmed | rejected | cancelled | reschedule | completed | no-show
------------------------------------------------------------ */
const APPOINTMENTS = [
  { id: 'DTB-2025-00101', patientId: 'pat-1', clinicId: 'clinic-1', dentistId: 'den-1', serviceId: 'svc-1', start: '2025-10-02T10:00:00', end: '2025-10-02T10:30:00', status: 'confirmed',  notes: 'First visit.' },
  { id: 'DTB-2025-00102', patientId: 'pat-2', clinicId: 'clinic-2', dentistId: 'den-3', serviceId: 'svc-4', start: '2025-10-03T14:00:00', end: '2025-10-03T15:00:00', status: 'pending',    notes: '' },
  { id: 'DTB-2025-00103', patientId: 'pat-3', clinicId: 'clinic-3', dentistId: 'den-4', serviceId: 'svc-6', start: '2025-10-04T09:30:00', end: '2025-10-04T10:00:00', status: 'reschedule', notes: 'Requested new slot.' },
  { id: 'DTB-2025-00104', patientId: 'pat-4', clinicId: 'clinic-1', dentistId: 'den-2', serviceId: 'svc-2', start: '2025-09-25T11:00:00', end: '2025-09-25T11:45:00', status: 'completed',  notes: '' },
  { id: 'DTB-2025-00105', patientId: 'pat-5', clinicId: 'clinic-2', dentistId: 'den-1', serviceId: 'svc-3', start: '2025-10-05T15:00:00', end: '2025-10-05T15:30:00', status: 'pending',    notes: 'Please call before confirming.' },
];


/* ------------------------------------------------------------
   LOOKUP HELPERS
------------------------------------------------------------ */
function getClinicById(id)  { return CLINICS.find(c => c.id === id); }
function getServiceById(id) { return SERVICES.find(s => s.id === id); }
function getDentistById(id) { return DENTISTS.find(d => d.id === id); }
function getPatientById(id) { return PATIENTS.find(p => p.id === id); }
function getStaffById(id)   { return STAFF.find(s => s.id === id); }

function getStatusLabel(status) {
  const labels = {
    pending:    'Pending Approval',
    confirmed:  'Confirmed',
    rejected:   'Rejected',
    cancelled:  'Cancelled',
    reschedule: 'Reschedule Requested',
    completed:  'Completed',
    'no-show':  'No-show',
  };
  return labels[status] || status;
}

function getStatusClass(status) {
  const map = {
    pending:    'badge--pending',
    confirmed:  'badge--confirmed',
    rejected:   'badge--rejected',
    cancelled:  'badge--cancelled',
    reschedule: 'badge--reschedule',
    completed:  'badge--completed',
    'no-show':  'badge--noshow',
  };
  return map[status] || '';
}


/* ------------------------------------------------------------
   ADDITIVE SEED — ensures every demo account exists
   in DB.users (patients + staff), without overwriting.
------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof DB === 'undefined' ||
      typeof PATIENTS === 'undefined' ||
      typeof STAFF === 'undefined') {
    console.warn('[DentaBook] Seed skipped — missing DB / PATIENTS / STAFF.');
    return;
  }

  const existing = DB.get('users', []);
  const byId = new Map(existing.map(u => [u.id, u]));
  let added = 0;

  PATIENTS.forEach(p => {
    if (!byId.has(p.id)) {
      byId.set(p.id, {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        password: 'password123',
        role: 'patient',
        phoneVerified: p.verified,
      });
      added++;
    }
  });

  STAFF.forEach(s => {
    if (!byId.has(s.id)) {
      byId.set(s.id, {
        id: s.id,
        name: s.name,
        email: s.email,
        phone: '',
        password: 'password123',
        role: 'staff',
        clinicId: s.clinicId,
        staffRole: s.role,
      });
      added++;
    }
  });

  if (added > 0) {
    const merged = [...byId.values()];
    DB.set('users', merged);
    console.log(`[DentaBook] Seeded ${added} new user(s). Total: ${merged.length}`);
  }
});