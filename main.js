// =================================================================================
// Main (Public) Page Logic with Google SSO Authentication
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const projectsGrid = document.getElementById('projectsGrid');
    
    // Auth UI Elements
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    // Other UI
    const countdownEl = document.getElementById('countdown-timer');
    const adminBtn = document.getElementById('adminBtn');

    // --- App State ---
    let currentUser = null;
    let activeSession = null;
    let userVoteInSession = null;
    let userRatingsMap = new Map();

    // =================================================================================
    // Authentication Handling
    // =================================================================================

    // Main listener that handles login/logout events
    _supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            console.log('Usuário logado:', session.user);
            updateUIForLoggedInUser(session.user);
            loadInitialData(session.user);
        } else if (event === 'SIGNED_OUT') {
            console.log('Usuário deslogado.');
            updateUIForLoggedOutUser();
        }
    });

    // Check initial auth state on page load
    async function checkInitialSession() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            console.log('Sessão existente encontrada:', session.user);
            updateUIForLoggedInUser(session.user);
            loadInitialData(session.user);
        } else {
            console.log('Nenhum usuário logado.');
            updateUIForLoggedOutUser();
        }
    }

    function updateUIForLoggedInUser(user) {
        currentUser = user;
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userProfile.classList.remove('hidden');
        logoutButton.classList.remove('hidden');

        userName.textContent = user.user_metadata?.full_name || user.email;
        userAvatar.src = user.user_metadata?.avatar_url || 'logo02.png';
    }

    function updateUIForLoggedOutUser() {
        currentUser = null;
        loginContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        userProfile.classList.add('hidden');
        logoutButton.classList.add('hidden');
    }

    // Event Listeners for Login/Logout
    loginButton.addEventListener('click', async () => {
        showNotification('Redirecionando para o Google...', 'info');
        const { error } = await _supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) {
            showNotification('Erro ao tentar fazer login: ' + error.message, 'error');
        }
    });

    logoutButton.addEventListener('click', async () => {
        showNotification('Saindo...', 'info');
        const { error } = await _supabase.auth.signOut();
        if (error) {
            showNotification('Erro ao sair: ' + error.message, 'error');
        }
    });

    // =================================================================================
    // Data Loading and Rendering
    // =================================================================================

    async function loadInitialData(user) {
        if (!user) return;
        
        const sessionData = await fetchActiveSession();
        if (sessionData) {
            activeSession = sessionData;
            await Promise.all([
                getUserVote(user.id, activeSession.session_uuid),
                getUserRatings(user.id)
            ]);
            await loadProjects();
            updateCountdown();
        }
    }

    async function fetchActiveSession() {
        const { data, error } = await _supabase
            .from('sessions')
            .select('session_uuid, ends_at')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Erro ao buscar sessão ativa:', error);
            projectsGrid.innerHTML = '<p class="error-message">Não foi possível determinar a sessão de votação.</p>';
            return null;
        }

        const session = (data && data.length > 0) ? data[0] : null;
        if (!session) {
            projectsGrid.innerHTML = '<p class="error-message">Nenhuma votação em andamento. Volte mais tarde!</p>';
        }
        return session;
    }

    async function getUserVote(userId, sessionUUID) {
        if (!userId || !sessionUUID) return null;
        
        const { data, error } = await _supabase
            .from('votes')
            .select('project_id')
            .eq('user_id', userId)
            .eq('session_uuid', sessionUUID)
            .limit(1);

        if (error) {
            console.error('Erro ao buscar voto do usuário:', error);
            userVoteInSession = null;
        } else {
            userVoteInSession = (data && data.length > 0) ? data[0].project_id : null;
        }
        console.log('Voto do usuário na sessão:', userVoteInSession);
        return userVoteInSession;
    }

    async function getUserRatings(userId) {
        if (!userId) return;
        const { data, error } = await _supabase
            .from('ratings')
            .select('project_id, rating')
            .eq('user_id', userId);

        if (error) {
            console.error('Erro ao buscar avaliações do usuário:', error);
        } else {
            userRatingsMap = new Map(data.map(r => [r.project_id, r.rating]));
        }
    }

    async function loadProjects() {
        const { data: projects, error } = await _supabase
            .from('projects_full_stats')
            .select('*')
            .order('vote_count', { ascending: false });

        if (error) {
            console.error('Erro ao carregar projetos:', error);
            projectsGrid.innerHTML = '<p class="error-message">Não foi possível carregar os projetos.</p>';
            return;
        }

        if (!projects || projects.length === 0) {
            projectsGrid.innerHTML = '<p class="error-message">Nenhum projeto cadastrado ainda.</p>';
            return;
        }

        projectsGrid.innerHTML = projects.map(project => createProjectCard(project, userVoteInSession, userRatingsMap)).join('');
        
        setTimeout(() => {
            initializeCarousels();
            initializeRatingStars();
        }, 50);
    }

    // =================================================================================
    // Voting & Rating Logic
    // =================================================================================

    window.handleVote = async (projectId) => {
        if (!currentUser || !activeSession) {
            showNotification('Sessão inválida. Por favor, recarregue a página.', 'error');
            return;
        }
        if (userVoteInSession) {
            showNotification('Você já votou nesta sessão!', 'error');
            return;
        }

        const { error } = await _supabase.from('votes').insert({ 
            project_id: projectId, 
            user_id: currentUser.id, 
            session_uuid: activeSession.session_uuid 
        });

        if (error) {
            console.error('Erro completo ao tentar inserir o voto:', error);
            showNotification('Erro ao registrar voto: ' + error.message, 'error');
        } else {
            showNotification('Voto registrado com sucesso!', 'success');
            userVoteInSession = projectId; // Update state immediately
            loadProjects(); 
        }
    };

    window.handleRating = async (projectId, rating) => {
        if (!currentUser) {
            showNotification('Você precisa estar logado para avaliar.', 'error');
            return;
        }

        const { error } = await _supabase
            .from('ratings')
            .upsert({
                project_id: projectId,
                user_id: currentUser.id,
                rating: rating
            }, {
                onConflict: 'user_id, project_id'
            });

        if (error) {
            showNotification('Erro ao salvar sua avaliação.', 'error');
            console.error('Rating error:', error);
        } else {
            showNotification(`Avaliação de ${rating} estrelas salva!`, 'success');
            userRatingsMap.set(projectId, rating);
            loadProjects(); 
        }
    };

    // =================================================================================
    // UI Components (Card, Countdown, etc.) - (Largely Unchanged)
    // =================================================================================
    
    function createProjectCard(project, votedProjectId, userRatingsMap) {
        const hasVotedForThis = votedProjectId === project.id;
        const hasVotedInSession = votedProjectId !== null;
        const userRatingForThis = userRatingsMap.get(project.id) || 0;

        let voteButtonHtml;
        if (hasVotedForThis) {
            voteButtonHtml = `<button class="vote-btn voted" disabled><i class="fas fa-check"></i> Votado</button>`;
        } else if (hasVotedInSession) {
            voteButtonHtml = `<button class="vote-btn" disabled>Você já votou</button>`;
        } else {
            voteButtonHtml = `<button class="vote-btn" onclick="window.handleVote(${project.id})"><i class="fas fa-vote-yea"></i> Votar</button>`;
        }

        let carouselHtml = `<div class="project-image-placeholder">Sem Imagem</div>`;
        if (project.image && Array.isArray(project.image) && project.image.length > 0) {
            const images = project.image.map((imgUrl, index) =>
                `<div class="carousel-item ${index === 0 ? 'active' : ''}" style="background-image: url('${imgUrl}')"></div>`
            ).join('');
            carouselHtml = `
                <div class="carousel" data-project-id="${project.id}" onclick="this.closest('.project-card').classList.toggle('carousel-expanded')">
                    <div class="carousel-inner">${images}</div>
                    ${project.image.length > 1 ? `
                        <button class="carousel-control prev" aria-label="Previous Image" onclick="event.stopPropagation(); window.carouselNavigate(this.closest('.carousel'), -1);">&lt;</button>
                        <button class="carousel-control next" aria-label="Next Image" onclick="event.stopPropagation(); window.carouselNavigate(this.closest('.carousel'), 1);">&gt;</button>
                    ` : ''}
                </div>
            `;
        }
        
        const cardFront = `
            <div class="card-front">
                ${carouselHtml}
                <div class="project-content-front">
                    <h3 class="project-title">${project.name}</h3>
                    <div class="front-actions">
                        ${voteButtonHtml}
                        ${project.link ? `<a href="${project.link}" target="_blank" class="btn btn-outline"><i class="fas fa-external-link-alt"></i> Ver Projeto</a>` : ''}
                    </div>
                    <div class="project-footer">
                        <div class="footer-stats">
                            <span class="vote-count"><i class="fas fa-heart"></i> ${project.vote_count}</span>
                            <span class="avg-rating"><i class="fas fa-star"></i> ${project.average_rating.toFixed(1)} (${project.rating_count})</span>
                        </div>
                        <button class="btn-saiba-mais" onclick="this.closest('.project-card-inner').classList.add('is-flipped')">
                            Saiba Mais <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const isRated = i <= userRatingForThis;
            starsHtml += `<i class="fas fa-star ${isRated ? 'rated' : ''}" data-value="${i}"></i>`;
        }

        const cardBack = `
            <div class="card-back">
                <div class="project-content-back">
                    <h4 class="back-title">Sobre o Projeto</h4>
                    <p class="project-description">${project.description}</p>
                    <p class="project-author"><i class="fas fa-user-graduate"></i> ${project.author} • ${project.category}</p>
                    <div class="rating-section">
                        <h4>Sua Avaliação</h4>
                        <div class="rating-stars" data-project-id="${project.id}">${starsHtml}</div>
                    </div>
                    ${project.pdf_url ? `<a href="${project.pdf_url}" target="_blank" class="btn btn-secondary"><i class="fas fa-file-pdf"></i> Baixar PDF</a>` : ''}
                    <button class="btn-voltar" onclick="this.closest('.project-card-inner').classList.remove('is-flipped')">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                </div>
            </div>
        `;

        return `
            <div class="project-card" style="animation-delay: ${Math.random() * 0.3}s">
                <div class="project-card-inner">${cardFront}${cardBack}</div>
            </div>
        `;
    }

    function updateCountdown() {
        if (!countdownEl || !activeSession || !activeSession.ends_at) return;
        const endDate = new Date(activeSession.ends_at).getTime();
        const now = new Date().getTime();
        const distance = endDate - now;

        if (distance < 0) {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            return;
        }
        document.getElementById('days').textContent = Math.floor(distance / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
        document.getElementById('hours').textContent = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
        document.getElementById('minutes').textContent = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    }

    function initializeCarousels() {
        document.querySelectorAll('.carousel').forEach(carousel => {
            const carouselInner = carousel.querySelector('.carousel-inner');
            const items = carouselInner.querySelectorAll('.carousel-item');

            if (items.length > 1) {
                carouselInner.dataset.currentIndex = 0;
                // Set up automatic navigation
                setInterval(() => {
                    window.carouselNavigate(carousel, 1);
                }, 5000); // Change image every 5 seconds
            }
        });
    }

    function initializeRatingStars() { /* Unchanged, but now uses currentUser.id via handleRating */ }

    window.carouselNavigate = (carousel, direction) => {
        const carouselInner = carousel.querySelector('.carousel-inner');
        if (!carouselInner) return;
        const items = carouselInner.querySelectorAll('.carousel-item');
        if (items.length <= 1) return;

        const itemWidth = items[0].clientWidth;
        let currentIndex = parseInt(carouselInner.dataset.currentIndex || 0);
        let newIndex = currentIndex + direction;

        if (newIndex < 0) {
            newIndex = items.length - 1;
        } else if (newIndex >= items.length) {
            newIndex = 0;
        }

        carouselInner.style.transform = `translateX(-${newIndex * itemWidth}px)`;
        carouselInner.dataset.currentIndex = newIndex;
    };

    // --- Initial Load ---
    checkInitialSession();
    setInterval(updateCountdown, 60000);
});

// --- Global Helper Functions ---
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}
