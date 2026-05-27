document.addEventListener('DOMContentLoaded', () => {

    // ---------- AUTENTICAÇÃO ----------
    const token = localStorage.getItem('omni_token');
if (token) {
    hideAuthScreen();        // exibe a estrutura vazia
    loadSessionsFromAPI();   // se falhar, redireciona automaticamente ao login
} else {
    showAuthScreen();
}

    function showAuthScreen() {
        document.getElementById('auth-screen').style.display = 'flex';
        document.querySelector('main').style.display = 'none';
        document.querySelector('.apex-nav').style.display = 'none';
        document.querySelector('.sync-section').style.display = 'none';
        document.querySelector('.omni-footer').style.display = 'none';
    }

    function hideAuthScreen() {
        document.getElementById('auth-screen').style.display = 'none';
        document.querySelector('main').style.display = 'block';
        document.querySelector('.apex-nav').style.display = 'flex';
        document.querySelector('.sync-section').style.display = 'block';
        document.querySelector('.omni-footer').style.display = 'block';
    }

    function logout() {
        localStorage.removeItem('omni_token');
        localStorage.removeItem('omni_user');
        showAuthScreen();
    }

    // Toggle entre formulários
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('show-register').style.display = 'none';
        document.getElementById('show-login').style.display = 'block';
        document.getElementById('auth-message').textContent = 'Crie sua conta Omni';
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('show-register').style.display = 'block';
        document.getElementById('show-login').style.display = 'none';
        document.getElementById('auth-message').textContent = 'Entre na sua central de comando';
    });

    // Registro via API
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;

        if (!name || !email || !password) return alert('Preencha todos os campos.');

        try {
            await apiRegister(name, email, password);
            alert('Conta criada! Faça login.');
            // Voltar ao login
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('show-register').style.display = 'block';
            document.getElementById('show-login').style.display = 'none';
            document.getElementById('auth-message').textContent = 'Entre na sua central de comando';
            document.getElementById('register-form').reset();
        } catch (err) {
            alert(err.message);
        }
    });

    // Login via API
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const data = await apiLogin(email, password);
            localStorage.setItem('omni_token', data.token);
            localStorage.setItem('omni_user', JSON.stringify(data.user));
            hideAuthScreen();
            await loadSessionsFromAPI();
            updateUI();
        } catch (err) {
            alert(err.message);
        }
    });

    // ========== ESTADO OMNI ==========
    const state = {
        sessions: [],
        startTime: Date.now(),
        currentImage: '',
        activeFilter: 'all',
        currentSessionId: null
    };

    // ========== ELEMENTOS DOM ==========
    const loader = document.getElementById('loader');
    const omniForm = document.getElementById('omni-form');
    const omniList = document.getElementById('omni-list');
    const imageUrlInput = document.getElementById('image-url');
    const previewContainer = document.getElementById('image-preview-container');
    const timerDisplay = document.getElementById('session-timer');
    const filterBtns = document.querySelectorAll('.filter-btn');

    const focusScoreEl = document.getElementById('focus-score');
    const statTasksEl = document.getElementById('stat-tasks');
    const statHoursEl = document.getElementById('stat-hours');
    const statStreakEl = document.getElementById('stat-streak');

    const modal = document.getElementById('report-modal');
    const ratingBtns = document.querySelectorAll('.rate-btn');
    const saveReportBtn = document.getElementById('save-report');
    const reportNotes = document.getElementById('report-notes');

    // ========== INICIALIZAÇÃO ==========
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 800);
        }, 1200);
    });

    initTimer();
    updateUI();

    function initTimer() {
        setInterval(() => {
            const elapsed = Date.now() - state.startTime;
            const h = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
            const m = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
            timerDisplay.textContent = `${h}:${m}:${s}`;
        }, 1000);
    }

    // ========== IMAGENS ==========
    const updateImagePreview = (url) => {
        if (url.trim().length > 0) {
            state.currentImage = url.trim();
            previewContainer.style.display = 'block';
            previewContainer.innerHTML = `
                <div class="omni-preview" style="position:relative; background:#000; border-radius:15px; overflow:hidden; border:2px solid var(--accent); height:200px; display:flex; align-items:center; justify-content:center;">
                    <img src="${state.currentImage}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <p style="display:none; color:var(--accent); font-weight:bold;">Imagem pendente ou URL inválida</p>
                    <button type="button" class="remove-preview" style="position:absolute; top:10px; right:10px; background:var(--accent); color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-weight:bold;">&times;</button>
                </div>`;
            previewContainer.querySelector('.remove-preview').onclick = () => {
                state.currentImage = '';
                previewContainer.innerHTML = '';
                previewContainer.style.display = 'none';
                imageUrlInput.value = '';
            };
        } else {
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
            state.currentImage = '';
        }
    };

    imageUrlInput.addEventListener('input', (e) => updateImagePreview(e.target.value.trim()));
    imageUrlInput.addEventListener('change', (e) => updateImagePreview(e.target.value.trim()));

    // ========== FILTROS ==========
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeFilter = btn.dataset.filter;
            renderList();
        });
    });

    // ========== SUBMISSÃO DE PROTOCOLO (API via app.js) ==========
    omniForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!getToken()) return;

        const newSession = {
            id: 'OMNI-' + Math.random().toString(36).substr(2, 9),
            subject: document.getElementById('subject').value,
            duration: parseInt(document.getElementById('duration').value),
            priority: document.getElementById('priority').value,
            method: document.getElementById('method').value,
            topics: document.getElementById('topics').value,
            image_url: state.currentImage
        };

        try {
            await apiCreateSession(newSession);
            // Feedback
            const btn = omniForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'PROTOCOLO SINCRONIZADO <i class="fas fa-check-circle"></i>';
            btn.style.background = '#2ecc71';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);

            omniForm.reset();
            state.currentImage = '';
            previewContainer.innerHTML = '';
            await loadSessionsFromAPI();
        } catch (err) {
            alert(err.message);
        }
    });

    // ========== CARREGAR SESSÕES DA API ==========
    async function loadSessionsFromAPI() {
    const token = getToken();
    if (!token) {
        showAuthScreen();
        return;
    }
    try {
        const sessions = await apiGetSessions();
        state.sessions = sessions;
        updateUI();
    } catch (err) {
        console.error('Falha ao carregar sessões:', err);
        // Limpa dados inválidos e força a tela de login
        localStorage.removeItem('omni_token');
        localStorage.removeItem('omni_user');
        showAuthScreen();
    }
}

    // ========== RENDERIZAÇÃO & UI ==========
    function updateUI() {
        renderList();
        updateDashboard();
    }

    function renderList() {
        omniList.innerHTML = '';

        const filtered = state.sessions.filter(s => {
            if (state.activeFilter === 'all') return true;
            return s.status === (state.activeFilter === 'done' ? 'completed' : 'pending');
        });

        if (filtered.length === 0) {
            omniList.innerHTML = `
                <div class="omni-empty">
                    <i class="fas fa-satellite-dish"></i>
                    <p>Aguardando entrada de dados para processamento...</p>
                </div>`;
            return;
        }

        filtered.forEach(session => {
            const card = document.createElement('div');
            card.className = `omni-card priority-${session.priority} ${session.status}`;

            const imageHtml = session.image_url ? `
                <div class="card-omni-image">
                    <img src="${session.image_url}" alt="Anexo" onerror="this.parentElement.style.display='none'">
                </div>` : '';

            card.innerHTML = `
                ${imageHtml}
                <div class="card-omni-body">
                    <div class="card-omni-main">
                        <span class="prio-tag">${session.priority.toUpperCase()}</span>
                        <h4>${session.subject}</h4>
                        <p><i class="fas fa-brain"></i> Método: ${session.method.toUpperCase()}</p>
                    </div>
                    <div class="card-omni-meta">
                        <span><i class="far fa-clock"></i> ${session.duration}m</span>
                        <span><i class="fas fa-scroll"></i> Tópico</span>
                    </div>
                </div>
                <div class="card-omni-actions">
                    <button class="omni-action-btn del" title="Excluir" onclick="deleteSession('${session.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    ${session.status === 'pending' ? `
                        <button class="omni-action-btn start" title="Iniciar Estudo" onclick="startCountdown('${session.id}')" id="start-btn-${session.id}">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="omni-action-btn done" title="Concluir" onclick="openReportModal('${session.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : '<span class="done-label"><i class="fas fa-award"></i> CONCLUÍDO</span>'}
                </div>
                <div class="card-timer-overlay" id="timer-overlay-${session.id}">
                    <div class="timer-display" id="display-${session.id}">00:00</div>
                    <button class="stop-timer-btn" onclick="stopCountdown('${session.id}')">PARAR</button>
                </div>
            `;
            omniList.appendChild(card);
        });
    }

    function updateDashboard() {
        const completed = state.sessions.filter(s => s.status === 'completed');
        const totalMinutes = completed.reduce((acc, s) => acc + s.duration, 0);

        statTasksEl.textContent = state.sessions.length;
        statHoursEl.textContent = Math.round(totalMinutes / 60) + 'h';
        statStreakEl.textContent = completed.length > 0 ? '12' : '0';

        const score = state.sessions.length > 0 ? Math.round((completed.length / state.sessions.length) * 100) : 0;
        focusScoreEl.textContent = score + '%';

        document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    // ========== FUNÇÕES GLOBAIS ==========
    window.deleteSession = async (id) => {
        if (!getToken()) return;
        if (activeTimers[id]) {
            clearInterval(activeTimers[id]);
            delete activeTimers[id];
        }
        try {
            await apiDeleteSession(id);
            state.sessions = state.sessions.filter(s => s.id !== id);
            updateUI();
        } catch (err) {
            alert(err.message);
        }
    };

    window.openReportModal = (id) => {
        state.currentSessionId = id;
        ratingBtns.forEach(b => b.classList.remove('active'));
        reportNotes.value = '';
        modal.classList.add('active');
    };

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            state.currentSessionId = null;
        }
    });

    ratingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ratingBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Finalizar protocolo (API)
    saveReportBtn.addEventListener('click', async () => {
        if (!state.currentSessionId || !getToken()) return;

        const selected = document.querySelector('.rate-btn.active');
        if (!selected) return alert('Selecione como você se sente.');

        const moodText = selected.textContent.trim();
        const moodValue = parseInt(selected.dataset.val);
        const notes = reportNotes.value.trim();

        try {
            await apiUpdateSession(state.currentSessionId, {
                status: 'completed',
                mood: moodText,
                mood_value: moodValue,
                report_notes: notes
            });

            modal.classList.remove('active');
            state.currentSessionId = null;
            await loadSessionsFromAPI();
        } catch (err) {
            alert(err.message);
        }
    });

    // ========== CONTAGEM REGRESSIVA ==========
    const activeTimers = {};

    window.startCountdown = (id) => {
        const session = state.sessions.find(s => s.id === id);
        if (!session) return;

        const overlay = document.getElementById(`timer-overlay-${id}`);
        const display = document.getElementById(`display-${id}`);
        const startBtn = document.getElementById(`start-btn-${id}`);

        overlay.classList.add('active');
        if (startBtn) startBtn.disabled = true;

        let timeLeft = session.duration * 60;

        activeTimers[id] = setInterval(() => {
            const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const secs = (timeLeft % 60).toString().padStart(2, '0');
            display.textContent = `${mins}:${secs}`;

            if (timeLeft <= 0) {
                clearInterval(activeTimers[id]);
                overlay.innerHTML = `<div class="timer-done">MISSÃO CUMPRIDA!</div>
                                     <button class="btn-omni-small" onclick="openReportModal('${id}')">CONCLUIR</button>`;
                delete activeTimers[id];
            }
            timeLeft--;
        }, 1000);
    };

    window.stopCountdown = (id) => {
        if (activeTimers[id]) {
            clearInterval(activeTimers[id]);
            delete activeTimers[id];
        }
        const overlay = document.getElementById(`timer-overlay-${id}`);
        const startBtn = document.getElementById(`start-btn-${id}`);

        if (overlay) overlay.classList.remove('active');
        if (startBtn) startBtn.disabled = false;
    };

    // ========== SINCRONIZAÇÃO (mantida como simulação) ==========
    const syncForm = document.getElementById('sync-form');
    if (syncForm) {
        syncForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const endpoint = document.getElementById('sync-endpoint').value;
            const btn = syncForm.querySelector('button');

            if (!endpoint) return alert('Por favor, insira um destino para o protocolo.');

            btn.innerHTML = 'ENVIANDO... <i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            setTimeout(() => {
                alert('Protocolo Omni sincronizado com sucesso para: ' + endpoint);
                btn.innerHTML = 'ENVIADO! <i class="fas fa-check"></i>';
                btn.style.background = '#2ecc71';
                document.getElementById('sync-endpoint').value = '';

                setTimeout(() => {
                    btn.innerHTML = 'ENVIAR AGORA <i class="fas fa-paper-plane"></i>';
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
            }, 2000);
        });
    }
});