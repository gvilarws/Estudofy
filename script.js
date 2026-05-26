document.addEventListener('DOMContentLoaded', () => {
    const studyForm = document.getElementById('study-form');
    const studyList = document.getElementById('study-list');
    const totalTimeDisplay = document.getElementById('total-time');
    const subjectInput = document.getElementById('subject');
    const durationInput = document.getElementById('duration');
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    let studies = [];
    let totalMinutes = 0;

    // Toggle Menu Mobile
    menuToggle.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        if (navLinks.style.display === 'flex') {
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '70px';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = '#fff';
            navLinks.style.padding = '20px';
            navLinks.style.boxShadow = '0 10px 10px rgba(0,0,0,0.1)';
        }
    });

    // Função para atualizar a lista na tela
    function renderStudies() {
        studyList.innerHTML = '';
        
        if (studies.length === 0) {
            studyList.innerHTML = `
                <div class="empty-message">
                    <p>Sua lista está vazia. Comece adicionando um assunto!</p>
                </div>
            `;
            totalTimeDisplay.textContent = '0';
            return;
        }

        studies.forEach((study, index) => {
            const item = document.createElement('div');
            item.classList.add('study-item');
            if (study.completed) item.style.opacity = '0.6';

            item.innerHTML = `
                <div class="study-item-info">
                    <h4 style="${study.completed ? 'text-decoration: line-through' : ''}">${study.subject}</h4>
                    <p><i class="far fa-clock"></i> ${study.duration} minutos</p>
                </div>
                <div class="study-item-actions">
                    <button class="btn-action btn-complete" onclick="toggleComplete(${index})">
                        <i class="fas ${study.completed ? 'fa-undo' : 'fa-check-circle'}"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteStudy(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            studyList.appendChild(item);
        });

        updateTotalTime();
    }

    // Função para atualizar o tempo total
    function updateTotalTime() {
        totalMinutes = studies.reduce((acc, curr) => acc + parseInt(curr.duration), 0);
        totalTimeDisplay.textContent = totalMinutes;
    }

    // Adicionar novo estudo
    studyForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newStudy = {
            subject: subjectInput.value,
            duration: durationInput.value,
            completed: false
        };

        studies.push(newStudy);
        renderStudies();

        // Limpar campos
        subjectInput.value = '';
        durationInput.value = '';
        subjectInput.focus();

        // Efeito de feedback visual no botão
        const btn = e.target.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Adicionado! <i class="fas fa-check"></i>';
        btn.style.background = '#2ecc71';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 1500);
    });

    // Funções globais para os botões de ação (atribuídas ao window para funcionar com onclick inline)
    window.toggleComplete = (index) => {
        studies[index].completed = !studies[index].completed;
        renderStudies();
    };

    window.deleteStudy = (index) => {
        // Animação de saída antes de remover
        const items = document.querySelectorAll('.study-item');
        items[index].style.transform = 'translateX(100px)';
        items[index].style.opacity = '0';
        
        setTimeout(() => {
            studies.splice(index, 1);
            renderStudies();
        }, 300);
    };

    // Suavizar scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});
