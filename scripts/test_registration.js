// scripts/test_registration.js
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/data';
const STATIC_TOKEN = 'KIM3-SECURE-TOKEN-2026-X998A7B6C';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-api-key': STATIC_TOKEN,
  },
});

// Emulasi implementasi register seperti di src/api/client.ts
async function registerUser(userData) {
  const token =
    userData.email_verification_token ||
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const namaLengkap = (userData.nama_lengkap || '').trim();
  const namaPerusahaan = (userData.nama_perusahaan || '').trim() || namaLengkap;
  const namaPic = (userData.nama_pic || '').trim() || namaLengkap;
  const noTelepon = (userData.no_telepon || '').trim();

  const payload = {
    email: (userData.email || '').trim().toLowerCase(),
    password: userData.password,
    nama_lengkap: namaLengkap,
    nama_perusahaan: namaPerusahaan,
    nama_pic: namaPic,
    no_telepon: noTelepon,
    peran: userData.peran || 'Customer Fleet',
    email_verification_token: token,
  };

  const res = await client.post('/kim3/auth/register', payload);
  return res.data;
}

function getErrorMessage(err, fallback = 'Terjadi kesalahan.') {
  const data = err?.response?.data;
  let rawMsg = '';
  if (data) {
    if (typeof data.message === 'string' && data.message.trim()) rawMsg = data.message;
    else if (Array.isArray(data.errors) && data.errors.length > 0) {
      rawMsg = data.errors.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join('; ');
    } else if (typeof data.error === 'string' && data.error.trim()) {
      rawMsg = data.error;
    }
  }
  if (!rawMsg && typeof err?.message === 'string' && err.message.trim()) {
    rawMsg = err.message;
  }
  if (!rawMsg) return fallback;

  if (rawMsg.includes('pengguna_email_key') || (rawMsg.includes('duplicate key') && rawMsg.includes('email'))) {
    return 'Pendaftaran gagal. Email ini sudah terdaftar di sistem.';
  }
  if (rawMsg.includes('check_email_format')) {
    return 'Format email tidak valid. Pastikan domain dan penulisan email sudah benar.';
  }

  return rawMsg;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('   UNIT TEST REGISTRASI MITRA BENGKEL MASTER TRUCK   ');
  console.log('====================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Registrasi Perorangan / Pribadi (Budi Gunawan, no HP kosong)
  // -------------------------------------------------------------------------
  console.log('👉 [TEST 1] Registrasi Kategori Perorangan / Pribadi (tanpa No. HP)');
  try {
    const payloadPerorangan = {
      nama_lengkap: 'Budi Gunawan',
      nama_perusahaan: 'Budi Gunawan',
      nama_pic: 'Budi Gunawan',
      email: 'adnawaa1@gmail.com',
      no_telepon: '', // No HP opsional
      password: 'password123',
    };
    const res = await registerUser(payloadPerorangan);
    console.log('   Response API:', JSON.stringify(res.data || res));

    assert(res.success === true, 'Response status success adalah true');
    assert(res.data?.id > 0, `User id terbentuk di database (ID: ${res.data?.id})`);
    assert(res.data?.email === 'adnawaa1@gmail.com', 'Email tersimpan dengan benar: adnawaa1@gmail.com');
    assert(res.data?.nama_lengkap === 'Budi Gunawan', 'Nama lengkap tersimpan: Budi Gunawan');
    assert(res.data?.status_aktif === true, 'Akun status aktif bernilai true');
  } catch (err) {
    console.error('   ❌ Error saat registrasi perorangan:', getErrorMessage(err));
    failed++;
  }

  console.log('');

  // -------------------------------------------------------------------------
  // TEST 2: Registrasi Duplikat Email (adnawaa1@gmail.com)
  // -------------------------------------------------------------------------
  console.log('👉 [TEST 2] Percobaan Registrasi Ulang dengan Email yang Sama (Duplicate Test)');
  try {
    const payloadDuplicate = {
      nama_lengkap: 'Budi Gunawan Duplikat',
      email: 'adnawaa1@gmail.com',
      no_telepon: '081234567890',
      password: 'password123',
    };
    await registerUser(payloadDuplicate);
    assert(false, 'Harusnya throw error duplicate email');
  } catch (err) {
    const errorMsg = getErrorMessage(err);
    console.log('   Pesan error:', errorMsg);
    assert(
      errorMsg.includes('sudah terdaftar'),
      'Pesan error ramah muncul: "Pendaftaran gagal. Email ini sudah terdaftar di sistem."'
    );
  }

  console.log('');

  // -------------------------------------------------------------------------
  // TEST 3: Registrasi Perusahaan (PT/CV)
  // -------------------------------------------------------------------------
  console.log('👉 [TEST 3] Registrasi Kategori Perusahaan (PT/CV) (dengan Nama PIC & No. HP)');
  const testCompanyEmail = `pt.armada.${Date.now()}@gmail.com`;
  try {
    const payloadPerusahaan = {
      nama_lengkap: 'PT Mega Armada Persada',
      nama_perusahaan: 'PT Mega Armada Persada',
      nama_pic: 'Hendra Wijaya',
      email: testCompanyEmail,
      no_telepon: '081298765432',
      password: 'password123',
    };
    const res = await registerUser(payloadPerusahaan);
    console.log('   Response API:', JSON.stringify(res.data || res));

    assert(res.success === true, 'Response status success adalah true');
    assert(res.data?.id > 0, `User id terbentuk di database (ID: ${res.data?.id})`);
    assert(res.data?.email === testCompanyEmail, `Email perusahaan tersimpan: ${testCompanyEmail}`);
    assert(res.data?.nama_lengkap === 'PT Mega Armada Persada', 'Nama perusahaan tersimpan di nama_lengkap');
    assert(res.data?.nama_pic === 'Hendra Wijaya', 'Nama PIC tersimpan di nama_pic');
  } catch (err) {
    console.error('   ❌ Error saat registrasi perusahaan:', getErrorMessage(err));
    failed++;
  }

  console.log('\n====================================================');
  console.log(`HASIL AKHIR: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
