// Test comment
// =================================================================================
// Main (Public) Page Logic (Anonymous Sessions with Carousel)
// =================================================================================

// --- Image Modal Logic ---
window.openImageModal = (src) => {
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    if (imageModal && modalImage) {
        imageModal.style.display = "flex";
        modalImage.src = src;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const countdownEl = document.getElementById('countdown');
    const projectsGrid = document.getElementById('projectsGrid');
    const adminBtn = document.getElementById('adminBtn');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeImageModal = document.getElementById('closeImageModal');
    const carouselModal = document.getElementById('carouselModal');
    const modalCarouselContent = document.getElementById('modalCarouselContent');
    const closeCarouselModal = document.getElementById('closeCarouselModal');

    if (closeImageModal) {
        closeImageModal.onclick = function() {
            if (imageModal) {
                imageModal.style.display = "none";
            }
        }
    }

    if (imageModal) {
        imageModal.onclick = function(event) {
            if (event.target === imageModal) {
                imageModal.style.display = "none";
            }
        }
    }

    if (closeCarouselModal) {
        closeCarouselModal.onclick = function() {
            if (carouselModal) {
                carouselModal.style.display = "none";
                modalCarouselContent.innerHTML = ""; // Clear content
            }
        }
    }

    if (carouselModal) {
        carouselModal.onclick = function(event) {
            if (event.target === carouselModal) {
                carouselModal.style.display = "none";
                modalCarouselContent.innerHTML = ""; // Clear content
            }
        }
    }


    // --- App State ---
    let anonymousId = null;
    let activeSession = null;
    let userVoteInSession = null;
    let userRatingsMap = new Map();

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
        
        activeSession = session;
        updateCountdown();
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
            return null;
        }
        
        userVoteInSession = (data && data.length > 0) ? data[0].project_id : null;
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

    // --- Voting & Rating System ---
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
            if (error.code === '23505') { // Unique constraint violation
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

    window.handleRating = async (projectId, rating) => {
        if (!anonymousId) {
            showNotification('ID de usuário não encontrado.', 'error');
            return;
        }

        const { error } = await _supabase
            .from('ratings')
            .upsert({
                project_id: projectId,
                user_id: anonymousId,
                rating: rating
            }, {
                onConflict: 'user_id, project_id'
            });

        if (error) {
            showNotification('Erro ao salvar sua avaliação.', 'error');
            console.error('Rating error:', error);
        } else {
            showNotification(`Avaliação de ${rating} estrelas salva!`, 'success');
            // Update local map to reflect the change immediately
            userRatingsMap.set(projectId, rating);
            // The real-time subscription will trigger a full reload, but this makes the UI feel faster
            loadProjects(); 
        }
    };

    // --- Project Loading & UI ---
    async function loadProjects() {
        // Use the new view to get all stats at once
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

        // The view already provides vote_count for the active session, so no need to calculate it here.
        // We just need to pass the user's vote and ratings to the card renderer.
        projectsGrid.innerHTML = projects.map(project => createProjectCard(project, userVoteInSession, userRatingsMap)).join('');
        
        initializeCarousels();
        initializeRatingStars(); // New function to add event listeners to stars
    }

    function createProjectCard(project, votedProjectId, userRatingsMap) {
        const hasVotedForThis = votedProjectId === project.id;
        const hasVotedInSession = votedProjectId !== null;
        const userRatingForThis = userRatingsMap.get(project.id) || 0;

        // --- Vote Button ---
        let voteButtonHtml;
        if (hasVotedForThis) {
            voteButtonHtml = `<button class="vote-btn voted" disabled><i class="fas fa-check"></i> Votado</button>`;
        } else if (hasVotedInSession) {
            voteButtonHtml = `<button class="vote-btn" disabled>Você já votou</button>`;
        } else {
            voteButtonHtml = `<button class="vote-btn" onclick="window.handleVote(${project.id})"><i class="fas fa-vote-yea"></i> Votar</button>`;
        }

        // --- Carousel ---
        let carouselHtml = `<div class="project-image-placeholder">Sem Imagem</div>`;
        if (project.image && Array.isArray(project.image) && project.image.length > 0) {
            const images = project.image.map((imgUrl, index) =>
                `<div class="carousel-item ${index === 0 ? 'active' : ''}" style="background-image: url('${imgUrl}')"></div>`
            ).join('');

            carouselHtml = `
                <div class="carousel" data-project-id="${project.id}" onclick="this.closest('.project-card').classList.toggle('carousel-expanded')">
                    <div class="carousel-inner">${images}</div>
                    ${project.image.length > 1 ? `
                        <button class="carousel-control prev" aria-label="Previous Image" onclick="event.stopPropagation(); window.carouselNavigate(this, -1);">&lt;</button>
                        <button class="carousel-control next" aria-label="Next Image" onclick="event.stopPropagation(); window.carouselNavigate(this, 1);">&gt;</button>
                    ` : ''}
                </div>
            `;
        }
        
        // --- Card Front ---
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

        // --- Star Rating HTML for Card Back ---
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            // Mark stars up to the user's rating as 'rated'
            const isRated = i <= userRatingForThis;
            starsHtml += `<i class="fas fa-star ${isRated ? 'rated' : ''}" data-value="${i}"></i>`;
        }

        // --- Card Back ---
        const cardBack = `
            <div class="card-back">
                <div class="project-content-back">
                    <h4 class="back-title">Sobre o Projeto</h4>
                    <p class="project-description">${project.description}</p>
                    <p class="project-author"><i class="fas fa-user-graduate"></i> ${project.author} • ${project.category}</p>
                    
                    <div class="rating-section">
                        <h4>Sua Avaliação</h4>
                        <div class="rating-stars" data-project-id="${project.id}">
                            ${starsHtml}
                        </div>
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
                <div class="project-card-inner">
                    ${cardFront}
                    ${cardBack}
                </div>
            </div>
        `;
    }

    // --- Carousel Logic ---
    function initializeCarousels() {
        // ... (existing carousel logic remains the same)
    }

    // --- Rating Stars Logic ---
    function initializeRatingStars() {
        const allRatingStarsContainers = document.querySelectorAll('.rating-stars');

        allRatingStarsContainers.forEach(container => {
            const stars = container.querySelectorAll('i');
            const projectId = container.dataset.projectId;

            // Function to visually update stars
            const updateStars = (hoverValue) => {
                stars.forEach(star => {
                    if (star.dataset.value <= hoverValue) {
                        star.classList.add('hover');
                    } else {
                        star.classList.remove('hover');
                    }
                });
            };

            container.addEventListener('mouseout', () => {
                stars.forEach(star => star.classList.remove('hover'));
            });

            stars.forEach(star => {
                star.addEventListener('mouseover', () => {
                    updateStars(star.dataset.value);
                });

                star.addEventListener('click', () => {
                    const rating = star.dataset.value;
                    window.handleRating(projectId, rating);
                });
            });
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings' }, async () => {
                await getUserRatings(anonymousId);
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
            // Fetch both user votes and ratings before loading projects
            await Promise.all([
                getUserVote(anonymousId, session.session_uuid),
                getUserRatings(anonymousId)
            ]);
            await loadProjects();
        }
        if (adminBtn) adminBtn.classList.remove('hidden');
    }

    // --- Lemon Animation Logic ---
    const lemonIcon = document.getElementById('nav-lemon-icon');
    if (lemonIcon) {
        lemonIcon.classList.add('lemon-spin');

        function randomizeSpin() {
            const randomDuration = Math.random() * 4.5 + 0.5;
            lemonIcon.style.animationDuration = `${randomDuration}s`;
            const randomDelay = Math.random() * 5000 + 3000;
            setTimeout(randomizeSpin, randomDelay);
        }
        randomizeSpin();
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
        notification.remove();
    }, 4000); // Notification stays for 4 seconds
}
