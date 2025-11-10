// =================================================================================
// Main (Public) Page Logic (Anonymous Sessions with Carousel)
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const countdownEl = document.getElementById('countdown');
    const projectsGrid = document.getElementById('projectsGrid');
    const adminBtn = document.getElementById('adminBtn');

    // --- App State ---
    let anonymousId = null;
    let activeSession = null;
    let userVoteInSession = null;

    // --- UUID Generator ---
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // --- Anonymous ID Management ---
    function getOrSetAnonymousId() {
        let userId = localStorage.getItem('limonada_user_id');
        if (!userId) {
            userId = generateUUID();
            localStorage.setItem('limonada_user_id', userId);
        }
        anonymousId = userId;
    }

    // --- Countdown Timer ---
    function updateCountdown() {
        if (!countdownEl || !activeSession || !activeSession.ends_at) {
            if(document.getElementById('days')) document.getElementById('days').textContent = '00';
            if(document.getElementById('hours')) document.getElementById('hours').textContent = '00';
            if(document.getElementById('minutes')) document.getElementById('minutes').textContent = '00';
            return;
        }

        const endDate = new Date(activeSession.ends_at).getTime();
        const now = new Date().getTime();
        const distance = endDate - now;

        if (distance < 0) {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        document.getElementById('days').textContent = days.toString().padStart(2, '0');
        document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    }

    // --- Data Fetching ---
    async function fetchActiveSession() {
        const { data, error } = await _supabase.from('sessions').select('session_uuid, ends_at').eq('is_active', true).single();
        if (error && error.code !== 'PGRST116') {
            console.error('Erro ao buscar sessão ativa:', error);
            projectsGrid.innerHTML = '<p class="error-message">Não há uma votação ativa no momento.</p>';
            return null;
        }
        if (!data) {
            projectsGrid.innerHTML = '<p class="error-message">Nenhuma votação em andamento. Volte mais tarde!</p>';
        }
        activeSession = data;
        updateCountdown(); // Update countdown as soon as session is fetched
        return data;
    }

    async function getUserVote(userId, sessionUUID) {
        if (!userId || !sessionUUID) return null;
        
        // Usar .limit(1) em vez de .single() para evitar o erro 406 quando não encontra resultados.
        const { data, error } = await _supabase
            .from('votes')
            .select('project_id')
            .eq('user_id', userId)
            .eq('session_uuid', sessionUUID)
            .limit(1);

        if (error) {
            console.error('Erro ao buscar voto do usuário:', error);
            return null;
        }
        
        // Se data existir e tiver um item, o usuário já votou.
        userVoteInSession = (data && data.length > 0) ? data[0].project_id : null;
        return userVoteInSession;
    }

    // --- Voting System ---
    window.handleVote = async (projectId) => {
        if (!anonymousId || !activeSession) {
            showNotification('Não há uma sessão de votação ativa.', 'error');
            return;
        }
        if (userVoteInSession) {
            showNotification('Você já votou nesta sessão!', 'error');
            return;
        }
        const { error } = await _supabase.from('votes').insert({ project_id: projectId, user_id: anonymousId, session_uuid: activeSession.session_uuid });
        if (error) {
            if (error.code === '23505') {
                showNotification('Você já votou nesta sessão!', 'error');
                await getUserVote(anonymousId, activeSession.session_uuid);
                loadProjects();
            } else {
                showNotification('Erro ao registrar voto: ' + error.message, 'error');
                console.error('Erro ao votar:', error);
            }
        } else {
            showNotification('Voto registrado com sucesso!', 'success');
        }
    };

    // --- Project Loading & UI ---
    async function loadProjects() {
        if (!activeSession) {
            console.log("Nenhuma sessão ativa para carregar projetos.");
            return;
        }
        const { data: projects, error } = await _supabase.from('projects_with_votes').select('*').order('votes', { ascending: false });
        if (error) {
            console.error('Erro ao carregar projetos:', error);
            projectsGrid.innerHTML = '<p class="error-message">Não foi possível carregar os projetos.</p>';
            return;
        }
        projectsGrid.innerHTML = projects.map(project => createProjectCard(project, userVoteInSession)).join('');
        initializeCarousels(); // Ativa a lógica dos carrosséis
    }

    function createProjectCard(project, votedProjectId) {
        const hasVotedForThis = votedProjectId === project.id;
        const hasVotedInSession = votedProjectId !== null;

        let btnHtml;
        if (hasVotedForThis) {
            btnHtml = `<button class="vote-btn voted" disabled><i class="fas fa-check"></i> Votado</button>`;
        } else if (hasVotedInSession) {
            btnHtml = `<button class="vote-btn" disabled>Você já votou</button>`;
        } else {
            btnHtml = `<button class="vote-btn" onclick="window.handleVote(${project.id})">Votar</button>`;
        }

        // --- Carousel HTML Generation ---
        let imageHtml;
        if (project.image && Array.isArray(project.image) && project.image.length > 0) {
            const images = project.image.map((imgUrl, index) => 
                `<img src="${imgUrl}" alt="${project.name} - Imagem ${index + 1}" class="carousel-item ${index === 0 ? 'active' : ''}">`
            ).join('');
            
            imageHtml = `
                <div class="carousel">
                    <div class="carousel-inner">${images}</div>
                    ${project.image.length > 1 ? `
                        <button class="carousel-control prev" aria-label="Previous Image">&lt;</button>
                        <button class="carousel-control next" aria-label="Next Image">&gt;</button>
                    ` : ''}
                </div>
            `;
        } else {
            imageHtml = `<img src="https://placehold.co/600x400?text=Sem+Imagem" alt="${project.name}" class="project-image">`;
        }

        return `
            <div class="project-card" style="animation-delay: ${Math.random() * 0.3}s">
                ${imageHtml}
                <div class="project-content">
                    <h3 class="project-title">${project.name}</h3>
                    <p class="project-author"><i class="fas fa-user-graduate"></i> ${project.author} • ${project.category}</p>
                    <p class="project-description">${project.description}</p>
                    <div class="project-footer">
                        <span class="vote-count"><i class="fas fa-heart"></i> ${project.votes} votos</span>
                        ${btnHtml}
                    </div>
                    <div class="card-actions">
                        ${project.link ? `<a href="${project.link}" target="_blank" class="btn btn-outline"><i class="fas fa-external-link-alt"></i> Ver Projeto</a>` : ''}
                        ${project.pdf_url ? `<a href="${project.pdf_url}" target="_blank" class="btn btn-secondary"><i class="fas fa-file-pdf"></i> Baixar PDF</a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // --- Carousel Logic ---
    function initializeCarousels() {
        const carousels = document.querySelectorAll('.carousel');
        carousels.forEach(carousel => {
            const inner = carousel.querySelector('.carousel-inner');
            const items = carousel.querySelectorAll('.carousel-item');
            const prevBtn = carousel.querySelector('.carousel-control.prev');
            const nextBtn = carousel.querySelector('.carousel-control.next');
            let currentIndex = 0;
            let intervalId = null;

            function showItem(index) {
                // Use transform for a sliding effect
                inner.style.transform = `translateX(-${index * 100}%)`;
            }

            function next() {
                currentIndex = (currentIndex + 1) % items.length;
                showItem(currentIndex);
            }

            function prev() {
                currentIndex = (currentIndex - 1 + items.length) % items.length;
                showItem(currentIndex);
            }

            function startCarousel() {
                if (items.length > 1) {
                    intervalId = setInterval(next, 4000); // Change slide every 4 seconds
                }
            }

            function resetCarousel() {
                clearInterval(intervalId);
                startCarousel();
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    prev();
                    resetCarousel();
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    next();
                    resetCarousel();
                });
            }
            
            // Clone first and last items for a seamless loop effect
            if (items.length > 1) {
                const firstClone = items[0].cloneNode(true);
                const lastClone = items[items.length - 1].cloneNode(true);
                
                inner.appendChild(firstClone);
                inner.insertBefore(lastClone, items[0]);

                inner.style.transition = 'transform 0.5s ease-in-out';

                inner.addEventListener('transitionend', () => {
                    if (currentIndex === items.length) {
                        inner.style.transition = 'none';
                        currentIndex = 0;
                        showItem(currentIndex);
                        setTimeout(() => {
                            inner.style.transition = 'transform 0.5s ease-in-out';
                        });
                    }
                });
            }

            startCarousel();
        });
    }

    // --- Real-time Updates ---
    function subscribeToChanges() {
        const channel = _supabase.channel('public-main-changes');
        channel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, loadProjects)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, async () => {
                await getUserVote(anonymousId, activeSession?.session_uuid);
                loadProjects();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, async () => {
                showNotification('Uma nova sessão de votação começou!', 'info');
                await initializeApp();
            })
            .subscribe();
    }

    // --- Initialization ---
    async function initializeApp() {
        getOrSetAnonymousId();
        const session = await fetchActiveSession();
        if (session) {
            await getUserVote(anonymousId, session.session_uuid);
            await loadProjects();
        }
        if (adminBtn) adminBtn.classList.remove('hidden');
    }

    initializeApp();
    updateCountdown();
    setInterval(updateCountdown, 60000);
    subscribeToChanges();
});

// --- Notification System ---
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease forwards';
        setTimeout(() => notification.remove(), 500);
    }, 3000);

    try {
        let ruleExists = false;
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.name === 'slideOut') {
                        ruleExists = true;
                        break;
                    }
                }
            } catch (e) { /* Ignore CORS errors */ }
            if (ruleExists) break;
        }

        if (!ruleExists) {
            for (const sheet of document.styleSheets) {
                if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
                    sheet.insertRule(`@keyframes slideOut { from { transform: translateX(0); opacity: 0; } to { transform: translateX(110%); opacity: 0; } }`, sheet.cssRules.length);
                    break;
                }
            }
        }
    } catch (e) {
        console.warn("Could not add slideOut animation rule.", e);
    }
}
