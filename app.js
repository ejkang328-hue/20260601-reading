// ==========================================================================
// 지혜의 숲 독서 타이머 Dashboard - Core Javascript
// ==========================================================================

// --- State Definition ---
let students = [];
let todoText = "📖 오늘 읽을 책을 꺼내고, 30분간 집중해서 책을 읽어봅시다! 독서가 끝나면 독서록 한 줄평을 작성해요.";
let timerInterval = null;
let sortMode = "id"; // 'id' (번호순) or 'rank' (순위순)
let layoutMode = "3"; // '3' (3줄에 모두 보기), '2' (2줄에 모두 보기), 'auto' (자동 바둑판)

// --- DOM Elements ---
const currentHourDateEl = document.getElementById('current-date');
const currentHourTimeEl = document.getElementById('current-time');
const studentsGridEl = document.getElementById('students-grid');
const studentCountInput = document.getElementById('student-count-input');
const setStudentCountBtn = document.getElementById('set-student-count-btn');
const sortSelectEl = document.getElementById('sort-select');
const rowsSelectEl = document.getElementById('rows-select');
const startAllBtn = document.getElementById('start-all-btn');
const stopAllBtn = document.getElementById('stop-all-btn');
const resetAllBtn = document.getElementById('reset-all-btn');
const activeStudentsCountEl = document.getElementById('active-students-count');
const totalClassTimeEl = document.getElementById('total-class-time');

// Todo Widget Elements
const editTodoBtn = document.getElementById('edit-todo-btn');
const todoDisplayMode = document.getElementById('todo-display-mode');
const todoEditMode = document.getElementById('todo-edit-mode');
const todoTextContent = document.getElementById('todo-text-content');
const todoTextarea = document.getElementById('todo-textarea');
const cancelTodoBtn = document.getElementById('cancel-todo-btn');
const saveTodoBtn = document.getElementById('save-todo-btn');

// Modal Elements
const nameEditModal = document.getElementById('name-edit-modal');
const editStudentNameInput = document.getElementById('edit-student-name');
const editStudentIdInput = document.getElementById('edit-student-id');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSaveBtn = document.getElementById('modal-save-btn');

// ==========================================================================
// Initialization & Storage
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initClock();
    startTimerLoop();
    initTodoEvents();
    initControlEvents();
    initModalEvents();
    
    // Lucide Icons Render
    lucide.createIcons();
});

// Load state from LocalStorage
function loadData() {
    const savedStudents = localStorage.getItem('class_reading_students');
    const savedTodo = localStorage.getItem('class_reading_todo');
    const savedSort = localStorage.getItem('class_reading_sort_mode');
    const savedLayout = localStorage.getItem('class_reading_layout_mode');
    
    if (savedTodo) {
        todoText = savedTodo;
    }
    todoTextContent.textContent = todoText;
    todoTextarea.value = todoText;

    if (savedSort) sortMode = savedSort;
    if (savedLayout) layoutMode = savedLayout;
    
    if (sortSelectEl) sortSelectEl.value = sortMode;
    if (rowsSelectEl) rowsSelectEl.value = layoutMode;

    if (savedStudents) {
        try {
            students = JSON.parse(savedStudents);
            // 안전조치: 새로 로드될 때 모든 작동 중인 타이머는 멈춤(false) 상태로 시작하되,
            // 누적 경과 시간(elapsedTime)은 유지합니다.
            students.forEach(s => {
                s.isRunning = false;
            });
            studentCountInput.value = students.length;
        } catch (e) {
            console.error("데이터 로드 중 오류 발생, 초기화합니다.", e);
            initDefaultStudents(20);
        }
    } else {
        initDefaultStudents(20); // 기본값 20명
    }
    
    renderStudentsGrid();
    updateStatistics();
}

// Save state to LocalStorage
function saveState() {
    localStorage.setItem('class_reading_students', JSON.stringify(students));
    localStorage.setItem('class_reading_todo', todoText);
    localStorage.setItem('class_reading_sort_mode', sortMode);
    localStorage.setItem('class_reading_layout_mode', layoutMode);
}

// Generate initial list of students
function initDefaultStudents(count) {
    students = [];
    for (let i = 1; i <= count; i++) {
        students.push({
            id: i,
            name: `${i}번 학생`,
            elapsedTime: 0, // 밀리초 단위
            isRunning: false,
            lastStartTime: null
        });
    }
    studentCountInput.value = count;
    saveState();
}

// ==========================================================================
// Clock & Timer Engine
// ==========================================================================

function initClock() {
    function tick() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const day = dayNames[now.getDay()];
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        currentHourDateEl.textContent = `${year}년 ${month}월 ${date}일 (${day})`;
        currentHourTimeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
    tick();
    setInterval(tick, 1000);
}

// Core Timer Loop (100ms interval for smooth UI and precision)
function startTimerLoop() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const now = Date.now();
        let stateChanged = false;
        
        students.forEach(student => {
            if (student.isRunning) {
                if (student.lastStartTime) {
                    const delta = now - student.lastStartTime;
                    if (delta > 0) {
                        student.elapsedTime += delta;
                        stateChanged = true;
                    }
                }
                student.lastStartTime = now;
            }
        });
        
        // 시간 갱신이 있는 경우 UI 및 통계 실시간 업데이트
        if (stateChanged) {
            updateTimersDisplay();
            updateStatistics();
        }
    }, 100);
}

// Calculate student ranks based on reading time
function getStudentRanks() {
    const activeStudents = students
        .filter(s => s.elapsedTime > 0)
        .sort((a, b) => b.elapsedTime - a.elapsedTime);
        
    const ranks = {};
    
    let currentRank = 1;
    for (let i = 0; i < activeStudents.length; i++) {
        if (i > 0 && activeStudents[i].elapsedTime < activeStudents[i - 1].elapsedTime) {
            currentRank = i + 1;
        }
        ranks[activeStudents[i].id] = currentRank;
    }
    
    students.forEach(s => {
        if (s.elapsedTime === 0) {
            ranks[s.id] = null;
        }
    });
    
    return ranks;
}

// Update only the time text and rank badge in UI to minimize DOM reconstruction
function updateTimersDisplay() {
    const ranks = getStudentRanks();
    students.forEach(student => {
        const card = document.querySelector(`.student-card[data-id="${student.id}"]`);
        if (card) {
            const timeDisplay = card.querySelector('.card-time-display');
            if (timeDisplay) {
                timeDisplay.textContent = formatTime(student.elapsedTime);
            }
            
            // 실시간 순위 배지 업데이트
            const headerLeft = card.querySelector('.header-left');
            if (headerLeft) {
                const existingBadge = headerLeft.querySelector('.rank-badge');
                const rank = ranks[student.id];
                let rankBadgeHtml = '';
                
                if (rank !== null) {
                    if (rank === 1) {
                        rankBadgeHtml = `<span class="rank-badge rank-1"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown"><path d="M2 4 5 12h14l3-8-7 4-3-6-3 6-7-4z"/><path d="M3 20h18a1 1 0 0 0 1-1v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1a1 1 0 0 0 1 1z"/></svg> 1위</span>`;
                    } else if (rank === 2) {
                        rankBadgeHtml = `<span class="rank-badge rank-2">2위</span>`;
                    } else if (rank === 3) {
                        rankBadgeHtml = `<span class="rank-badge rank-3">3위</span>`;
                    } else {
                        rankBadgeHtml = `<span class="rank-badge rank-other">${rank}위</span>`;
                    }
                } else {
                    rankBadgeHtml = `<span class="rank-badge rank-none">-</span>`;
                }
                
                if (existingBadge && existingBadge.outerHTML !== rankBadgeHtml) {
                    existingBadge.outerHTML = rankBadgeHtml;
                }
            }
        }
    });
}

// Convert Milliseconds to HH:MM:SS format
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ==========================================================================
// UI Rendering
// ==========================================================================

function renderStudentsGrid() {
    studentsGridEl.innerHTML = '';
    
    // Apply grid layout classes
    studentsGridEl.className = 'students-grid';
    studentsGridEl.style.gridTemplateColumns = '';
    
    const appContainer = document.querySelector('.app-container');
    if (layoutMode === '2') {
        const cols = Math.ceil(students.length / 2);
        studentsGridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        studentsGridEl.classList.add('layout-fit-rows');
        if (appContainer) appContainer.classList.add('layout-fit-active');
    } else if (layoutMode === '3') {
        const cols = Math.ceil(students.length / 3);
        studentsGridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        studentsGridEl.classList.add('layout-fit-rows');
        if (appContainer) appContainer.classList.add('layout-fit-active');
    } else {
        if (appContainer) appContainer.classList.remove('layout-fit-active');
    }
    
    const ranks = getStudentRanks();
    const displayStudents = [...students];
    
    if (sortMode === 'rank') {
        displayStudents.sort((a, b) => {
            if (b.elapsedTime !== a.elapsedTime) {
                return b.elapsedTime - a.elapsedTime;
            }
            return a.id - b.id;
        });
    } else {
        displayStudents.sort((a, b) => a.id - b.id);
    }
    
    displayStudents.forEach(student => {
        const card = document.createElement('div');
        card.className = `student-card ${student.isRunning ? 'active' : ''}`;
        card.setAttribute('data-id', student.id);
        
        const rank = ranks[student.id];
        let rankBadgeHtml = '';
        if (rank !== null) {
            if (rank === 1) {
                rankBadgeHtml = `<span class="rank-badge rank-1"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown"><path d="M2 4 5 12h14l3-8-7 4-3-6-3 6-7-4z"/><path d="M3 20h18a1 1 0 0 0 1-1v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1a1 1 0 0 0 1 1z"/></svg> 1위</span>`;
            } else if (rank === 2) {
                rankBadgeHtml = `<span class="rank-badge rank-2">2위</span>`;
            } else if (rank === 3) {
                rankBadgeHtml = `<span class="rank-badge rank-3">3위</span>`;
            } else {
                rankBadgeHtml = `<span class="rank-badge rank-other">${rank}위</span>`;
            }
        } else {
            rankBadgeHtml = `<span class="rank-badge rank-none">-</span>`;
        }
        
        card.innerHTML = `
            <div class="card-header">
                <div class="header-left">
                    ${rankBadgeHtml}
                    <div class="student-name-box" onclick="openNameEditModal(${student.id})">
                        <span class="student-name" title="클릭하여 이름 수정">${escapeHtml(student.name)}</span>
                        <i data-lucide="edit-2" class="name-edit-indicator"></i>
                    </div>
                </div>
                <i data-lucide="book-open" class="status-icon"></i>
            </div>
            <div class="card-time-display">${formatTime(student.elapsedTime)}</div>
            <button class="btn-toggle-timer">
                <i data-lucide="${student.isRunning ? 'pause' : 'play'}" style="width: 14px; height: 14px;"></i>
                <span>${student.isRunning ? '정지' : '시작'}</span>
            </button>
        `;
        
        // 개별 타이머 토글 버튼 이벤트 리스너 바인딩
        const toggleBtn = card.querySelector('.btn-toggle-timer');
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStudentTimer(student.id);
        });
        
        studentsGridEl.appendChild(card);
    });
    
    // Lucide 아이콘 활성화
    lucide.createIcons();
}

function updateStatistics() {
    const activeCount = students.filter(s => s.isRunning).length;
    const totalMs = students.reduce((acc, curr) => acc + curr.elapsedTime, 0);
    
    activeStudentsCountEl.textContent = `${activeCount}명`;
    totalClassTimeEl.textContent = formatTime(totalMs);
}

// Safe escape to prevent XSS when custom student names are added
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ==========================================================================
// Control Operations (Individual & Global)
// ==========================================================================

function toggleStudentTimer(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    const now = Date.now();
    student.isRunning = !student.isRunning;
    
    if (student.isRunning) {
        student.lastStartTime = now;
    } else {
        student.lastStartTime = null;
        saveState(); // 멈출 때 영속 저장
    }
    
    // UI 카드 상태 클래스 및 버튼 텍스트 변경
    const card = document.querySelector(`.student-card[data-id="${id}"]`);
    if (card) {
        card.classList.toggle('active', student.isRunning);
        const btn = card.querySelector('.btn-toggle-timer');
        btn.innerHTML = `
            <i data-lucide="${student.isRunning ? 'pause' : 'play'}" style="width: 14px; height: 14px;"></i>
            <span>${student.isRunning ? '정지' : '시작'}</span>
        `;
        lucide.createIcons();
    }
    
    updateStatistics();
}

// Setup Event Listeners for controls
function initControlEvents() {
    // 1. 학생 수 설정
    setStudentCountBtn.addEventListener('click', () => {
        const newCount = parseInt(studentCountInput.value);
        if (isNaN(newCount) || newCount < 1 || newCount > 60) {
            alert("학생 수는 1명부터 60명까지 설정할 수 있습니다.");
            return;
        }
        
        const currentCount = students.length;
        if (newCount === currentCount) return;
        
        if (newCount < currentCount) {
            const confirmReduce = confirm(`학생 수를 ${currentCount}명에서 ${newCount}명으로 줄이겠습니까?\n주의: 초과되는 학생들(${newCount + 1}번 ~ ${currentCount}번)의 오늘 독서 기록은 삭제됩니다.`);
            if (!confirmReduce) {
                studentCountInput.value = currentCount;
                return;
            }
            // 배열 자르기
            students = students.slice(0, newCount);
        } else {
            // 늘어난 만큼 새로운 학생 추가
            for (let i = currentCount + 1; i <= newCount; i++) {
                students.push({
                    id: i,
                    name: `${i}번 학생`,
                    elapsedTime: 0,
                    isRunning: false,
                    lastStartTime: null
                });
            }
        }
        
        saveState();
        renderStudentsGrid();
        updateStatistics();
    });
    
    // 2. 전체 시작
    startAllBtn.addEventListener('click', () => {
        const now = Date.now();
        students.forEach(s => {
            if (!s.isRunning) {
                s.isRunning = true;
                s.lastStartTime = now;
            }
        });
        saveState();
        renderStudentsGrid();
        updateStatistics();
    });
    
    // 3. 전체 정지
    stopAllBtn.addEventListener('click', () => {
        students.forEach(s => {
            if (s.isRunning) {
                s.isRunning = false;
                s.lastStartTime = null;
            }
        });
        saveState();
        renderStudentsGrid();
        updateStatistics();
    });
    
    // 4. 전체 초기화
    resetAllBtn.addEventListener('click', () => {
        const confirmReset = confirm("우리 반 학생들의 오늘의 모든 독서 시간 기록을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.");
        if (confirmReset) {
            students.forEach(s => {
                s.isRunning = false;
                s.elapsedTime = 0;
                s.lastStartTime = null;
            });
            saveState();
            renderStudentsGrid();
            updateStatistics();
        }
    });

    // 5. 정렬 기준 변경
    sortSelectEl.addEventListener('change', (e) => {
        sortMode = e.target.value;
        saveState();
        renderStudentsGrid();
    });
    
    // 6. 화면 배치 변경
    rowsSelectEl.addEventListener('change', (e) => {
        layoutMode = e.target.value;
        saveState();
        renderStudentsGrid();
    });
}

// ==========================================================================
// Todo Widget Logics
// ==========================================================================

function initTodoEvents() {
    editTodoBtn.addEventListener('click', () => {
        todoTextarea.value = todoText;
        todoDisplayMode.classList.add('hidden');
        todoEditMode.classList.remove('hidden');
        todoTextarea.focus();
    });
    
    cancelTodoBtn.addEventListener('click', () => {
        todoDisplayMode.classList.remove('hidden');
        todoEditMode.classList.add('hidden');
    });
    
    saveTodoBtn.addEventListener('click', () => {
        todoText = todoTextarea.value.trim();
        if (todoText === "") {
            todoText = "📖 독서 시간입니다. 집중해서 책을 읽어봅시다!";
        }
        todoTextContent.textContent = todoText;
        todoDisplayMode.classList.remove('hidden');
        todoEditMode.classList.add('hidden');
        saveState();
    });
}

// ==========================================================================
// Name Editing Modal Logics
// ==========================================================================

function initModalEvents() {
    closeModalBtn.addEventListener('click', closeNameEditModal);
    modalCancelBtn.addEventListener('click', closeNameEditModal);
    
    modalSaveBtn.addEventListener('click', () => {
        const studentId = parseInt(editStudentIdInput.value);
        const newName = editStudentNameInput.value.trim();
        
        if (newName === "") {
            alert("이름을 공백으로 설정할 수 없습니다.");
            return;
        }
        
        const student = students.find(s => s.id === studentId);
        if (student) {
            student.name = newName;
            saveState();
            
            // 전체 그리드를 다시 렌더링하지 않고 특정 카드의 이름 영역만 업데이트
            const cardNameSpan = document.querySelector(`.student-card[data-id="${studentId}"] .student-name`);
            if (cardNameSpan) {
                cardNameSpan.textContent = newName;
            }
        }
        closeNameEditModal();
    });
    
    // Close modal when clicking on dark overlay
    nameEditModal.addEventListener('click', (e) => {
        if (e.target === nameEditModal) {
            closeNameEditModal();
        }
    });
    
    // Keyboard enter key support inside input
    editStudentNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            modalSaveBtn.click();
        }
    });
}

function openNameEditModal(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    editStudentIdInput.value = student.id;
    editStudentNameInput.value = student.name;
    
    nameEditModal.classList.remove('hidden');
    // For smooth transition, wait a tiny bit to focus
    setTimeout(() => {
        editStudentNameInput.focus();
        editStudentNameInput.select();
    }, 50);
}

function closeNameEditModal() {
    nameEditModal.classList.add('hidden');
}

// Exposed to window globally for onclick inside dynamic template string
window.openNameEditModal = openNameEditModal;
