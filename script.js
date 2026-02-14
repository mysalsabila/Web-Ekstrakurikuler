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


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let myChart = null;

// UI Elements
const sections = {
    auth: document.getElementById('authContainer'),
    siswa: document.getElementById('siswaSection'),
    admin: document.getElementById('adminSection'),
    nav: document.getElementById('mainNavbar')
};

// ==========================================
// FIX: FUNGSI TOGGLE PASSWORD
// ==========================================
function setupPasswordToggle(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(buttonId);
    if (input && btn) {
        btn.addEventListener('click', () => {
            const icon = btn.querySelector('i');
            if (input.type === "password") {
                input.type = "text";
                icon.classList.replace('bi-eye-slash', 'bi-eye');
            } else {
                input.type = "password";
                icon.classList.replace('bi-eye', 'bi-eye-slash');
            }
        });
    }
}
setupPasswordToggle('password', 'toggleLoginPass');
setupPasswordToggle('regPassword', 'toggleRegPass');

// Navigation Toggle
document.getElementById('btnToRegister')?.addEventListener('click', () => {
    document.getElementById('loginSection').classList.add('d-none');
    document.getElementById('registerSection').classList.remove('d-none');
});
document.getElementById('btnToLogin')?.addEventListener('click', () => {
    document.getElementById('registerSection').classList.add('d-none');
    document.getElementById('loginSection').classList.remove('d-none');
});

// Register
document.getElementById('registerAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;
    
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", cred.user.uid), {
            nama: document.getElementById('regNama').value,
            nis: document.getElementById('regNis').value,
            kelas: document.getElementById('regKelas').value,
            jenis_kelamin: gender,
            email: email,
            role: 'siswa'
        });
        await signOut(auth);
        showToast("Berhasil! Silakan Login", "green");
        document.getElementById('btnToLogin').click();
    } catch (err) { showToast(err.message, "red"); }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
    } catch (err) { showToast("Login Gagal!", "red"); }
});

document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
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
    } else {
        sections.nav.classList.add('d-none');
        sections.siswa.classList.add('d-none');
        sections.admin.classList.add('d-none');
        sections.auth.classList.remove('d-none');
    }
});

// Siswa Logic
async function loadSiswaData(uid) {
    const select = document.getElementById('pilihanEkskul');
    select.innerHTML = '<option value="">Pilih Ekskul</option>';
    const snap = await getDocs(collection(db, "ekskul"));
    snap.forEach(doc => {
        select.innerHTML += `<option value="${doc.id}">${doc.data().nama}</option>`;
    });
    checkStatus(uid);
}

async function checkStatus(uid) {
    const q = query(collection(db, "pendaftaran"), where("id_siswa", "==", uid));
    const snap = await getDocs(q);
    const div = document.getElementById('statusPendaftaran');
    if (!snap.empty) {
        const d = snap.docs[0].data();
        div.innerHTML = `<div class="alert alert-success">Terdaftar di: <b>${d.nama_ekskul}</b></div>`;
        document.querySelector('#daftarEkskulForm button').disabled = true;
    } else {
        div.innerHTML = "Belum mendaftar";
    }
}

document.getElementById('daftarEkskulForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const eksDoc = await getDoc(doc(db, "ekskul", document.getElementById('pilihanEkskul').value));
    const uDoc = await getDoc(doc(db, "users", currentUser.uid));
    await addDoc(collection(db, "pendaftaran"), {
        id_siswa: currentUser.uid,
        nama_siswa: uDoc.data().nama,
        jenis_kelamin: uDoc.data().jenis_kelamin,
        kelas: uDoc.data().kelas,
        nama_ekskul: eksDoc.data().nama,
        tanggal_daftar: new Date().toLocaleDateString('id-ID')
    });
    showToast("Berhasil!", "green");
    checkStatus(currentUser.uid);
});

// Admin Logic
async function loadAdminData() {
    await loadTable();
    await loadMaster();
    renderChart();
}

async function loadTable() {
    const tbody = document.querySelector('#tabelPendaftar tbody');
    const totalText = document.getElementById('totalPendaftarText');
    const snap = await getDocs(collection(db, "pendaftaran"));
    tbody.innerHTML = '';
    let no = 1;
    snap.forEach(doc => {
        const d = doc.data();
        tbody.innerHTML += `<tr>
            <td>${no++}</td>
            <td>${d.nama_siswa}</td>
            <td>${d.jenis_kelamin || '-'}</td>
            <td>${d.kelas}</td>
            <td><span class="badge bg-primary">${d.nama_ekskul}</span></td>
            <td>${d.tanggal_daftar}</td>
            <td><button onclick="hapusDaftar('${doc.id}')" class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button></td>
        </tr>`;
    });
    totalText.innerText = `${snap.size} Siswa`;
}

async function renderChart() {
    const snap = await getDocs(collection(db, "pendaftaran"));
    const counts = {};
    snap.forEach(doc => {
        const name = doc.data().nama_ekskul;
        counts[name] = (counts[name] || 0) + 1;
    });

    const ctx = document.getElementById('ekskulChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                label: 'Jumlah Pendaftar',
                data: Object.values(counts),
                backgroundColor: '#4a4eff',
                borderRadius: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

async function loadMaster() {
    const list = document.getElementById('listMasterEkskul');
    const snap = await getDocs(collection(db, "ekskul"));
    list.innerHTML = '';
    snap.forEach(doc => {
        list.innerHTML += `<li class="list-group-item d-flex justify-content-between">
            ${doc.data().nama} (Pembina: ${doc.data().pembina})
            <button onclick="hapusEkskul('${doc.id}')" class="btn btn-sm text-danger"><i class="bi bi-trash"></i></button>
        </li>`;
    });
}

document.getElementById('tambahEkskulForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "ekskul"), {
        nama: document.getElementById('namaEkskulBaru').value,
        pembina: document.getElementById('pembinaEkskul').value
    });
    loadMaster();
});

// Global Helpers
window.hapusDaftar = async (id) => { if (confirm("Hapus?")) { await deleteDoc(doc(db, "pendaftaran", id)); loadAdminData(); } };
window.hapusEkskul = async (id) => { if (confirm("Hapus?")) { await deleteDoc(doc(db, "ekskul", id)); loadMaster(); } };
window.exportToExcel = () => XLSX.writeFile(XLSX.utils.table_to_book(document.getElementById("tabelPendaftar")), "Laporan_Ekskul.xlsx");

window.exportToPDF = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const snap = await getDocs(collection(db, "pendaftaran"));
    
    // Judul
    doc.setFontSize(18);
    doc.text("LAPORAN PENDAFTARAN EKSTRAKURIKULER", 14, 15);
    doc.setFontSize(11);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);

    // 1. Render Tabel
    doc.autoTable({
        html: '#tabelPendaftar',
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [74, 78, 255] }
    });

    // 2. Info Total di PDF
    const finalYTable = doc.lastAutoTable.finalY;
    doc.setFont(undefined, 'bold');
    doc.text(`Total Siswa Mendaftar: ${snap.size} Siswa`, 14, finalYTable + 10);
    doc.setFont(undefined, 'normal');

    // 3. Ambil Gambar dari Chart Canvas
    const canvas = document.getElementById('ekskulChart');
    const chartImg = canvas.toDataURL("image/png", 1.0);
    
    // 4. Tambahkan Grafik
    const finalYChart = finalYTable + 20;
    doc.text("Visualisasi Data Peminat:", 14, finalYChart);
    doc.addImage(chartImg, 'PNG', 14, finalYChart + 5, 180, 80);

    doc.save("Laporan_Lengkap_Ekskul.pdf");
};

function showToast(msg, type) {
    let bg = type === "red" ? "#dc3545" : "#198754";
    Toastify({ text: msg, duration: 3000, style: { background: bg } }).showToast();
}
