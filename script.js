// ============================================================
// 1. IMPORT MODULES FIREBASE
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ============================================================
// 2. CONFIG FIREBASE (Sesuai punya kamu)
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBEut1RivuJCj4c7O99tEQZBo5qCztHPLk",
  authDomain: "ekskul-app-d245a.firebaseapp.com",
  projectId: "ekskul-app-d245a",
  storageBucket: "ekskul-app-d245a.firebasestorage.app",
  messagingSenderId: "1003738544671",
  appId: "1:1003738544671:web:d1fd395c09ad0a8a23332a"
};

// ============================================================
// 3. INISIALISASI
// ============================================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

// ============================================================
// 4. NAVIGASI UI
// ============================================================
const sections = {
    auth: document.getElementById('authContainer'),
    siswa: document.getElementById('siswaSection'),
    admin: document.getElementById('adminSection'),
    nav: document.getElementById('mainNavbar')
};
const loginDiv = document.getElementById('loginSection');
const registerDiv = document.getElementById('registerSection');

document.getElementById('btnToRegister').addEventListener('click', (e) => {
    e.preventDefault();
    loginDiv.classList.add('d-none');
    registerDiv.classList.remove('d-none');
});
document.getElementById('btnToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    registerDiv.classList.add('d-none');
    loginDiv.classList.remove('d-none');
});

// ============================================================
// 5. REGISTER LOGIC (DAFTAR -> SIMPAN -> LOGOUT -> LOGIN MANUAL)
// ============================================================
document.getElementById('registerAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    const nama = document.getElementById('regNama').value;
    const nis = document.getElementById('regNis').value;
    const kelas = document.getElementById('regKelas').value;

    if(pass.length < 6) return showToast("Password minimal 6 karakter!", "red");

    try {
        showToast("Sedang membuat akun...", "blue");

        // 1. Buat User (Firebase otomatis login background)
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        
        // 2. Simpan Data
        await setDoc(doc(db, "users", cred.user.uid), {
            nama: nama, nis: nis, kelas: kelas, email: email, role: 'siswa',
            createdAt: new Date().toISOString()
        });

        // 3. LOGOUT PAKSA (Agar user tidak masuk dashboard otomatis)
        await signOut(auth);

        showToast("Akun Berhasil Dibuat! Silakan Login.", "green");
        
        // 4. Reset & Balik ke Login
        document.getElementById('registerAccountForm').reset();
        registerDiv.classList.add('d-none');
        loginDiv.classList.remove('d-none');

    } catch (err) {
        let msg = "Gagal Daftar: " + err.message;
        if(err.code === 'auth/email-already-in-use') msg = "Email sudah terdaftar!";
        if(err.code === 'auth/invalid-email') msg = "Format email salah (Gunakan .com)!";
        showToast(msg, "red");
    }
});

// ============================================================
// 6. LOGIN & LOGOUT LOGIC
// ============================================================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, 
            document.getElementById('email').value, 
            document.getElementById('password').value
        );
        showToast("Login Berhasil! Memuat data...", "green");
        document.getElementById('loginForm').reset();
    } catch (err) {
        showToast("Email atau Password Salah!", "red");
    }
});

document.getElementById('btnLogout').addEventListener('click', () => {
    if(confirm("Keluar dari aplikasi?")) signOut(auth);
});

// ============================================================
// 7. AUTH STATE CHECKER (ROUTER)
// ============================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                sections.auth.classList.add('d-none');
                sections.nav.classList.remove('d-none');

                if (userData.role === 'admin') {
                    sections.admin.classList.remove('d-none');
                    loadAdminData();
                } else {
                    sections.siswa.classList.remove('d-none');
                    document.getElementById('siswaNameDisplay').innerText = userData.nama;
                    loadSiswaData(user.uid);
                }
            }
        } catch (e) { console.error(e); }
    } else {
        currentUser = null;
        sections.nav.classList.add('d-none');
        sections.siswa.classList.add('d-none');
        sections.admin.classList.add('d-none');
        sections.auth.classList.remove('d-none');
        registerDiv.classList.add('d-none');
        loginDiv.classList.remove('d-none');
    }
});

// ============================================================
// 8. LOGIKA SISWA
// ============================================================
async function loadSiswaData(uid) {
    const select = document.getElementById('pilihanEkskul');
    select.innerHTML = '<option value="">-- Pilih Ekskul --</option>';
    try {
        const snap = await getDocs(collection(db, "ekskul"));
        snap.forEach(doc => {
            const d = doc.data();
            select.innerHTML += `<option value="${doc.id}">${d.nama} (Pembina: ${d.pembina})</option>`;
        });
        checkStatus(uid);
    } catch (e) {}
}

async function checkStatus(uid) {
    const statusDiv = document.getElementById('statusPendaftaran');
    const btn = document.querySelector('#daftarEkskulForm button');
    
    const q = query(collection(db, "pendaftaran"), where("id_siswa", "==", uid));
    const snap = await getDocs(q);

    if (!snap.empty) {
        const d = snap.docs[0].data();
        statusDiv.innerHTML = `
            <div class="alert alert-success border-0 shadow-sm">
                <h5 class="fw-bold">✅ TERDAFTAR</h5>
                <hr>
                <p class="mb-0">Ekskul: <strong>${d.nama_ekskul}</strong></p>
                <small class="text-muted">Tanggal: ${d.tanggal_daftar}</small>
            </div>`;
        btn.disabled = true;
        btn.innerText = "Sudah Terdaftar";
    } else {
        statusDiv.innerHTML = `<p class="text-muted">Kamu belum mendaftar apapun.</p>`;
        btn.disabled = false;
        btn.innerText = "Daftar Sekarang";
    }
}

document.getElementById('daftarEkskulForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ekskulId = document.getElementById('pilihanEkskul').value;
    if(!ekskulId) return showToast("Pilih ekskul dulu!", "red");

    const q = query(collection(db, "pendaftaran"), where("id_siswa", "==", currentUser.uid));
    const snap = await getDocs(q);
    if(!snap.empty) return showToast("Sudah punya ekskul!", "red");

    try {
        const ekskulDoc = await getDoc(doc(db, "ekskul", ekskulId));
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        
        await addDoc(collection(db, "pendaftaran"), {
            id_siswa: currentUser.uid,
            nama_siswa: userDoc.data().nama,
            kelas: userDoc.data().kelas,
            id_ekskul: ekskulId,
            nama_ekskul: ekskulDoc.data().nama,
            tanggal_daftar: new Date().toLocaleDateString('id-ID')
        });
        showToast("Berhasil Mendaftar!", "green");
        checkStatus(currentUser.uid);
    } catch(e) { showToast("Gagal", "red"); }
});

// ============================================================
// 9. LOGIKA ADMIN
// ============================================================
async function loadAdminData() { loadTable(); loadMaster(); }

async function loadTable() {
    const tbody = document.querySelector('#tabelPendaftar tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
    const snap = await getDocs(collection(db, "pendaftaran"));
    tbody.innerHTML = '';
    
    if (snap.empty) { tbody.innerHTML = '<tr><td colspan="6" class="text-center">Belum ada pendaftar.</td></tr>'; return; }

    let no = 1;
    snap.forEach(doc => {
        const d = doc.data();
        tbody.innerHTML += `
            <tr>
                <td>${no++}</td>
                <td>${d.nama_siswa}</td>
                <td>${d.kelas}</td>
                <td><span class="badge bg-primary">${d.nama_ekskul}</span></td>
                <td>${d.tanggal_daftar}</td>
                <td><button onclick="hapusDaftar('${doc.id}')" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i></button></td>
            </tr>`;
    });
}

// FUNGSI RENDER LIST EKSKUL ADMIN (DIPERBAIKI TAMPILANNYA)
async function loadMaster() {
    const list = document.getElementById('listMasterEkskul');
    list.innerHTML = '<div class="text-center p-3 text-muted">Memuat data...</div>';
    
    const snap = await getDocs(collection(db, "ekskul"));
    list.innerHTML = '';
    
    if (snap.empty) {
        list.innerHTML = '<div class="text-center p-3 text-muted">Belum ada ekskul.</div>';
        return;
    }

    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold text-dark d-block">${d.nama}</span>
                    <small class="text-muted"><i class="bi bi-person-badge"></i> Pembina: ${d.pembina}</small>
                </div>
                <button onclick="hapusEkskul('${doc.id}')" class="btn btn-outline-danger btn-sm" title="Hapus">
                    <i class="bi bi-x-circle"></i>
                </button>
            </li>`;
    });
}

document.getElementById('tambahEkskulForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "ekskul"), {
        nama: document.getElementById('namaEkskulBaru').value,
        pembina: document.getElementById('pembinaEkskul').value
    });
    document.getElementById('tambahEkskulForm').reset();
    showToast("Ekskul Ditambah!", "green");
    loadMaster();
});

// ============================================================
// 10. GLOBAL HELPERS
// ============================================================
function setupTogglePassword(inputId, toggleId) {
    const btn = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if(btn && input) {
        btn.addEventListener('click', () => {
            const icon = btn.querySelector('i');
            if(input.type === "password") { input.type = "text"; icon.classList.replace('bi-eye-slash','bi-eye'); }
            else { input.type = "password"; icon.classList.replace('bi-eye','bi-eye-slash'); }
        });
    }
}
setupTogglePassword('password', 'toggleLoginPass');
setupTogglePassword('regPassword', 'toggleRegPass');

window.hapusDaftar = async(id)=>{ if(confirm("Hapus?")) { await deleteDoc(doc(db,"pendaftaran",id)); loadTable(); }};
window.hapusEkskul = async(id)=>{ if(confirm("Hapus?")) { await deleteDoc(doc(db,"ekskul",id)); loadMaster(); }};
window.exportToExcel = ()=>{ XLSX.writeFile(XLSX.utils.table_to_book(document.getElementById("tabelPendaftar")), "Data_Ekskul.xlsx"); };
window.exportToPDF = ()=>{ 
    const doc = new window.jspdf.jsPDF(); 
    doc.text("Laporan Pendaftaran Ekskul", 14, 15);
    doc.autoTable({ html: '#tabelPendaftar', startY: 20 }); 
    doc.save("Laporan.pdf"); 
};

function showToast(msg, type) {
    let bg = type==="red"?"#dc3545":(type==="blue"?"#0d6efd":"#198754");
    Toastify({ text: msg, duration: 3000, style: { background: bg } }).showToast();
}