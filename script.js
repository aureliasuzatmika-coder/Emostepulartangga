// --- Data Permainan ---
const roles = [
    "Pemberi Kebahagiaan", "Pemberi Kesedihan", "Teman yang Menghibur", 
    "Teman yang Mengejek", "Pendengar yang Baik", "Pengganggu / Perundung",
    "Pendukung Positif", "Teman yang Mengabaikan"
];

const actions = [
    { name: "Menolong teman", type: "positif" },
    { name: "Menghibur orang sedih", type: "positif" },
    { name: "Mengajak bermain", type: "positif" },
    { name: "Mengejek teman", type: "negatif" },
    { name: "Membentak", type: "negatif" },
    { name: "Memberi semangat", type: "positif" },
    { name: "Mengajak kerja sama", type: "positif" },
    { name: "Membiarkan teman sendirian", type: "negatif" },
    { name: "Mengucapkan kata-kata kasar", type: "negatif" }
];

// Papan Ular Tangga (Snakes and Ladders) - 100 kotak
const BOARD_SIZE = 100;
// Menentukan Tangga (Kesenangan) dan Ular (Kesedihan)
const LADDERS = { 
    4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 63: 81, 71: 91
};
const SNAKES = { 
    17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78
};

// --- Status Permainan ---
let players = [
    { id: 1, name: "Pemain 1", position: 1, currentRole: null, currentAction: null, tokenClass: 'player-token-1' },
    { id: 2, name: "Pemain 2", position: 1, currentRole: null, currentAction: null, tokenClass: 'player-token-2' },
    { id: 3, name: "Pemain 3", position: 1, currentRole: null, currentAction: null, tokenClass: 'player-token-3' }
];
let currentPlayerIndex = 0;
let totalPositiveActions = 0;
let totalNegativeActions = 0;

// --- DOM Elements ---
const boardContainer = document.getElementById('board-container');
const roleCardEl = document.getElementById('role-card');
const actionCardEl = document.getElementById('action-card');
const actionTypeEl = document.getElementById('action-type');
const drawCardBtn = document.getElementById('draw-card-btn');
const performActionBtn = document.getElementById('perform-action-btn');
const rejectBtn = document.getElementById('reject-btn');
const reasonInput = document.getElementById('reason-input');
const submitRejectionBtn = document.getElementById('submit-rejection-btn');
const logMessageEl = document.getElementById('log-message');
const currentPlayerNameEl = document.getElementById('current-player-name');
const currentPlayerPosEl = document.getElementById('current-player-pos');
const judgeDecisionArea = document.getElementById('judge-decision-area');
const judgeMoveButtons = document.querySelectorAll('#judge-decision-area button');


// --- Fungsi Utilitas & UI ---

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function updateLog(message) {
    logMessageEl.innerHTML = `**[Hakim]** ${message}`;
}

/** Mengambil koordinat pixel token berdasarkan nomor kotak (1-100) */
function getSquareCoordinates(position) {
    if (position < 1 || position > BOARD_SIZE) return { x: 0, y: 0 };
    
    // Konversi posisi 1-100 ke koordinat (row, col) 0-9
    const posIndex = position - 1;
    const row0to9 = Math.floor(posIndex / 10);
    const isOddRow = row0to9 % 2 !== 0; // Baris 1 (index 1), 3, 5, ...
    
    let col0to9;
    if (!isOddRow) { // Baris 0, 2, 4, ... (Kotak 1-10, 21-30, ...) -> Kiri ke Kanan
        col0to9 = posIndex % 10;
    } else { // Baris 1, 3, 5, ... (Kotak 11-20, 31-40, ...) -> Kanan ke Kiri (Zigzag)
        col0to9 = 9 - (posIndex % 10);
    }

    // Hitung posisi pixel (di tengah kotak)
    const squareSize = boardContainer.clientWidth / 10;
    // Papan dibaca dari bawah (row 0 di bawah)
    const x = col0to9 * squareSize + (squareSize / 2);
    const y = (9 - row0to9) * squareSize + (squareSize / 2); // Row 9 di atas

    return { x: x, y: y };
}

/** Merender Papan Grid 10x10 (Dibalik, 100 di Kiri Atas, 1 di Kiri Bawah) */
function renderBoard() {
    boardContainer.innerHTML = '';
    
    // Perulangan untuk 10 baris (0-9)
    for (let r = 9; r >= 0; r--) {
        const isOddRow = r % 2 !== 0; // Baris 1 (11-20), 3 (31-40), ...
        
        // Perulangan untuk 10 kolom (0-9)
        for (let c = 0; c < 10; c++) {
            
            let boxNumber;
            if (isOddRow) { // Baris 1 (11-20), 3 (31-40), ... (Kanan ke Kiri)
                boxNumber = (r * 10) + (10 - c);
            } else { // Baris 0 (1-10), 2 (21-30), ... (Kiri ke Kanan)
                boxNumber = (r * 10) + (c + 1);
            }

            const square = document.createElement('div');
            square.className = 'square';
            square.textContent = boxNumber;
            square.id = `square-${boxNumber}`; // ID untuk memudahkan penempatan token

            if (boxNumber === 1) square.classList.add('start');
            if (boxNumber === BOARD_SIZE) square.classList.add('end');
            if (LADDERS[boxNumber]) square.classList.add('ladder');
            if (SNAKES[boxNumber]) square.classList.add('snake');
            
            boardContainer.appendChild(square);
        }
    }
}

/** Merender Token Pemain di Posisi yang Benar */
function renderTokens() {
    players.forEach(player => {
        let token = document.getElementById(`player-token-${player.id}`);
        if (!token) {
            token = document.createElement('div');
            token.className = `player-token ${player.tokenClass}`;
            token.id = `player-token-${player.id}`;
            token.textContent = player.id; 
            boardContainer.appendChild(token);
        }
        
        const coords = getSquareCoordinates(player.position);
        
        // Geser token ke tengah kotak
        token.style.transform = `translate(-50%, -50%) translate(${coords.x}px, ${coords.y}px)`;
    });
}

function renderGame() {
    const player = players[currentPlayerIndex];
    currentPlayerNameEl.textContent = player.name;
    currentPlayerPosEl.textContent = player.position;
    
    roleCardEl.textContent = player.currentRole || "Ambil Kartu";
    actionCardEl.textContent = player.currentAction ? player.currentAction.name : "Ambil Kartu";
    actionTypeEl.textContent = player.currentAction ? (player.currentAction.type === 'positif' ? 'POSISTIF (Maju)' : 'NEGATIF (Mundur)') : 'N/A';
    actionTypeEl.style.color = player.currentAction ? (player.currentAction.type === 'positif' ? '#2ecc71' : '#e74c3c') : '#333';


    renderTokens();
    
    // Cek kondisi akhir
    const winner = players.find(p => p.position >= BOARD_SIZE);
    if (winner) {
        updateLog(`***PERMAINAN SELESAI!*** **${winner.name}** menang. Total Aksi Positif: ${totalPositiveActions}, Negatif: ${totalNegativeActions}. Permainan berakhir **${totalPositiveActions > totalNegativeActions ? 'BAHAGIA' : 'SEDIH'}**.`);
        // Disable semua tombol
        drawCardBtn.disabled = true;
        performActionBtn.disabled = true;
        rejectBtn.disabled = true;
    }
}


// --- Logika Pergerakan & Hakim ---

function checkBoardFeatures(player, newPos) {
    let finalPos = newPos;
    let message = `**${player.name}** mendarat di Kotak **${finalPos}**.`;

    if (LADDERS[newPos]) {
        finalPos = LADDERS[newPos];
        message += ` **SELAMAT!** Kotak ini adalah **TANGGA KESENANGAN**! Lanjut ke Kotak **${finalPos}**.`;
    } else if (SNAKES[newPos]) {
        finalPos = SNAKES[newPos];
        message += ` **OH TIDAK!** Kotak ini adalah **ULAR KESEDIHAN**! Mundur ke Kotak **${finalPos}**.`;
    }
    
    player.position = finalPos;
    updateLog(message);
}

function movePlayer(steps, isPenalty = false) {
    const player = players[currentPlayerIndex];
    let newPos = player.position + steps;

    // Batasi posisi
    if (newPos > BOARD_SIZE) newPos = BOARD_SIZE;
    if (newPos < 1) newPos = 1;
    
    // Catat aksi (hanya jika bukan penalti penolakan)
    if (!isPenalty) {
        if (steps > 0) totalPositiveActions++;
        if (steps < 0) totalNegativeActions++;
    }

    // Terapkan pergerakan
    player.position = newPos;
    
    // Cek Ular/Tangga hanya jika ini bukan penalti (Penalti dianggap langkah "wajib" yang tidak disengaja)
    if (!isPenalty) {
        setTimeout(() => checkBoardFeatures(player, newPos), 1000); 
    } else {
        updateLog(`**PENALTI!** ${player.name} mundur 2 langkah. Posisi baru: Kotak ${player.position}.`);
    }

    renderGame();
    // Lanjut ke giliran berikutnya setelah animasi pergerakan dan cek ular/tangga selesai
    setTimeout(nextTurn, 3000); 
}

function nextTurn() {
    // Reset kartu
    players[currentPlayerIndex].currentRole = null;
    players[currentPlayerIndex].currentAction = null;
    
    // Pindah ke pemain berikutnya
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    
    // Reset UI
    judgeDecisionArea.style.display = 'none';
    judgeMoveButtons.forEach(btn => btn.disabled = true);
    reasonInput.disabled = true;
    submitRejectionBtn.disabled = true;
    
    // Update tampilan dan tombol
    renderGame();
    updateLog(`Giliran **${players[currentPlayerIndex].name}**. Silakan ambil kartu.`);
    drawCardBtn.disabled = false;
    performActionBtn.disabled = true;
    rejectBtn.disabled = true;
}


// --- Event Listeners ---

// 1. Ambil Kartu
drawCardBtn.addEventListener('click', () => {
    const player = players[currentPlayerIndex];
    player.currentRole = getRandomElement(roles);
    player.currentAction = getRandomElement(actions);
    
    updateLog(`**${player.name}** mengambil: Peran: **${player.currentRole}**, Tindakan: **${player.currentAction.name}**. Tampilkan ke Hakim atau Tolak?`);
    
    drawCardBtn.disabled = true;
    rejectBtn.disabled = false;
    performActionBtn.disabled = false;
    
    renderGame();
});

// 2. Tampilkan & Tunggu Penilaian (Aksi Positif/Negatif)
performActionBtn.addEventListener('click', () => {
    const player = players[currentPlayerIndex];
    const type = player.currentAction.type;

    updateLog(`**${player.name}** (${player.currentRole}) menampilkan tindakan **${player.currentAction.name}** (${type}). **Hakim, silakan tentukan Maju/Mundur 1-3 langkah.**`);

    // Tampilkan tombol keputusan Hakim
    judgeDecisionArea.style.display = 'block';
    
    // Filter tombol yang relevan untuk Hakim
    judgeMoveButtons.forEach(btn => {
        const steps = parseInt(btn.dataset.steps);
        const isPositiveButton = steps > 0;

        // Jika Tindakan Positif, hanya aktifkan tombol Maju (1-3)
        if (type === 'positif') {
            btn.disabled = !isPositiveButton;
        } 
        // Jika Tindakan Negatif, hanya aktifkan tombol Mundur (-1 hingga -3)
        else {
            btn.disabled = isPositiveButton;
        }
    });

    performActionBtn.disabled = true;
    rejectBtn.disabled = true;
});

// 3. Keputusan Hakim (Maju/Mundur)
judgeMoveButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        const steps = parseInt(event.target.dataset.steps);
        const player = players[currentPlayerIndex];
        
        judgeDecisionArea.style.display = 'none';
        judgeMoveButtons.forEach(btn => btn.disabled = true); // Matikan semua tombol Hakim
        
        updateLog(`Hakim memutuskan: **${steps > 0 ? 'MAJU' : 'MUNDUR'} ${Math.abs(steps)} langkah!** ${player.name} bergerak...`);
        movePlayer(steps);
    });
});

// 4. Tolak Kartu (Meminta Alasan)
rejectBtn.addEventListener('click', () => {
    updateLog(`**${players[currentPlayerIndex].name}** ingin menolak kartu. Berikan alasan yang baik di kolom bawah!`);
    rejectBtn.disabled = true;
    performActionBtn.disabled = true;
    reasonInput.disabled = false;
    submitRejectionBtn.disabled = false;
});

// 5. Kirim Alasan & Penilaian Penolakan Hakim
submitRejectionBtn.addEventListener('click', () => {
    const reason = reasonInput.value.trim();
    const player = players[currentPlayerIndex];

    if (reason.length < 5) {
        alert("Alasan harus lebih detail!");
        return;
    }
    
    // Logika Penilaian Hakim Otomatis (Simulasi Aturan Diterima/Ditolak)
    // Jika mengandung kata kunci empati/ketidaknyamanan -> Diterima
    const acceptedKeywords = ['tidak nyaman', 'sulit', 'tidak bisa', 'merasa tidak pantas', 'canggung'];
    const isReasonAccepted = acceptedKeywords.some(keyword => reason.toLowerCase().includes(keyword));
    
    reasonInput.disabled = true;
    submitRejectionBtn.disabled = true;
    
    if (isReasonAccepted) {
        // Alasan Diterima: Giliran lanjut, posisi tetap
        updateLog(`Alasan **"${reason}"** diterima (Alasan masuk akal/sensitif). Kartu dibatalkan. Posisi tetap: Kotak ${player.position}.`);
        setTimeout(nextTurn, 2000);
    } else {
        // Alasan Ditolak: Penalti Mundur 2 langkah (Hukuman kecil)
        updateLog(`Alasan **"${reason}"** ditolak (Meragukan). **PENALTI MUNDUR 2 LANGKAH!**`);
        setTimeout(() => movePlayer(-2, true), 1000); 
    }
});


// --- Inisialisasi Permainan ---
function initGame() {
    renderBoard();
    renderGame();
    updateLog("Permainan siap dimulai. Setiap giliran, ambil kartu, Hakim menilai, lalu cek Ular/Tangga!");
}

initGame();