document.addEventListener('DOMContentLoaded', () => {
    // === ESTADO OMNI ===
    const state = {
        sessions: JSON.parse(localStorage.getItem('omni_sessions')) || [],
        startTime: Date.now(),
        currentImage: '',
        activeFilter: 'all',
        currentSessionId: null  // para o modal
    };

    // === ELEMENTOS DOM ===
    const loader = document.getElementById('loader');
    const omniForm = document.getElementById('omni-form');
    const omniList = document.getElementById('omni-list');
    const imageUrlInput = document.getElementById('image-url');
    const previewContainer = document.getElementById('image-preview-container');
    const timerDisplay = document.getElementById('session-timer');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Stats
    const focusScoreEl = document.getElementById('focus-score');
    const statTasksEl = document.getElementById('stat-tasks');
    const statHoursEl = document.getElementById('stat-hours');
    const statStreakEl = document.getElementById('stat-streak');

    // Modal
    const modal = document.getElementById('report-modal');
    const ratingBtns = document.querySelectorAll('.rate-btn');
    const saveReportBtn = document.getElementById('save-report');
    const reportNotes = document.getElementById('report-notes');

    // === INICIALIZAÇÃO ===
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 800);
        }, 1200);
    });

    initTimer();
    updateUI();

    // === RELÓGIO DE SESSÃO ===
    function initTimer() {
        setInterval(() => {
            const elapsed = Date.now() - state.startTime;
            const h = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
            const m = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
            timerDisplay.textContent = `${h}:${m}:${s}`;
        }, 1000);
    }

    // === GESTÃO DE IMAGENS POR URL ===
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

    // === FILTROS DE LISTA ===
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeFilter = btn.dataset.filter;
            renderList();
        });
    });

    // === SUBMISSÃO DE PROTOCOLO ===
    omniForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newSession = {
            id: 'OMNI-' + Math.random().toString(36).substr(2, 9),
            subject: document.getElementById('subject').value,
            duration: parseInt(document.getElementById('duration').value),
            priority: document.getElementById('priority').value,
            method: document.getElementById('method').value,
            topics: document.getElementById('topics').value,
            image: state.currentImage,
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        state.sessions.unshift(newSession);
        save();
        updateUI();
        
        omniForm.reset();
        state.currentImage = '';
        previewContainer.innerHTML = '';
        
        // Feedback Visual Omni
        const btn = omniForm.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'PROTOCOLO SINCRONIZADO <i class="fas fa-check-circle"></i>';
        btn.style.background = '#2ecc71';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    });

    // === RENDERIZAÇÃO & UI ===
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
            
            const imageHtml = session.image ? `
                <div class="card-omni-image">
                    <img src="${session.image}" alt="Anexo" onerror="this.parentElement.style.display='none'">
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

    // === FUNÇÕES GLOBAIS ===
    window.deleteSession = (id) => {
    // Interrompe qualquer timer ativo para esta sessão
    if (activeTimers[id]) {
        clearInterval(activeTimers[id]);
        delete activeTimers[id];
    }
    // Remove a sessão do estado
    state.sessions = state.sessions.filter(s => s.id !== id);
    // Salva no localStorage e atualiza a interface
    save();
    updateUI();
};

    // *** NOVA FUNÇÃO: abrir modal de relatório ***
    window.openReportModal = (id) => {
        state.currentSessionId = id;
        // resetar seleção de humor e notas
        ratingBtns.forEach(b => b.classList.remove('active'));
        reportNotes.value = '';
        modal.classList.add('active');
    };

    // *** Fechar modal ao clicar fora ou no X (se houver) ***
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            state.currentSessionId = null;
        }
    });

    // *** Seleção de humor ***
    ratingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ratingBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // *** Finalizar protocolo (salvar relatório) ***
    saveReportBtn.addEventListener('click', () => {
        if (!state.currentSessionId) return;
        
        const session = state.sessions.find(s => s.id === state.currentSessionId);
        if (!session) return;

        // Verificar se algum humor foi selecionado
        const selectedRating = document.querySelector('.rate-btn.active');
        if (!selectedRating) {
            alert('Por favor, selecione como se sente: Exausto, Bem ou Invencível.');
            return;
        }

        const moodValue = parseInt(selectedRating.dataset.val);
        const moodText = selectedRating.textContent.trim();
        const notes = reportNotes.value.trim();

        // Atualizar sessão
        session.status = 'completed';
        session.report = {
            mood: moodText,
            moodValue: moodValue,
            notes: notes,
            completedAt: new Date().toISOString()
        };

        save();
        updateUI();
        
        // Fechar modal
        modal.classList.remove('active');
        state.currentSessionId = null;

        // Feedback rápido
        const btn = saveReportBtn;
        const originalText = btn.innerHTML;
        btn.innerHTML = 'PROTOCOLO FINALIZADO <i class="fas fa-check-circle"></i>';
        btn.style.background = '#2ecc71';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    });

    // === LÓGICA DE CONTAGEM REGRESSIVA ===
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

    function save() {
        localStorage.setItem('omni_sessions', JSON.stringify(state.sessions));
    }

    // === LÓGICA DE SINCRONIZAÇÃO FINAL ===
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