// =================================================================================
// Main (Public) Page Logic
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const countdownEl = document.getElementById('countdown');
    const projectsGrid = document.getElementById('projectsGrid');
    const loginBtn = document.getElementById('loginBtn');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfoEl = document.querySelector('.user-info');
    const userAvatarEl = document.getElementById('userAvatar');
    const userNameEl = document.getElementById('userName');
    const authModal = document.getElementById('authModal');
    const googleLoginBtn = document.getElementById('googleLoginBtn');

    let currentUser = null;
    let userProfile = null;

    // --- Countdown Timer ---
    function updateCountdown() {
        if (!countdownEl) return;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7); // 7 days from now

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

    // --- Auth System ---
    async function handleGoogleLogin() {
        const { error } = await auth.signInWithGoogle();
        if (error) {
            showNotification('Erro ao fazer login: ' + error.message, 'error');
        }
    }

    async function handleLogout() {
        await auth.signOut();
        currentUser = null;
        userProfile = null;
        updateUI();
        showNotification('Você saiu da sua conta.', 'info');
    }

    async function updateUI() {
        if (currentUser && userProfile) {
            userInfoEl.classList.remove('hidden');
            userAvatarEl.src = currentUser.user_metadata.avatar_url || userProfile.avatar_url;
            userNameEl.textContent = (currentUser.user_metadata.full_name || userProfile.full_name).split(' ')[0];
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');

            if (userProfile.role === 'admin') {
                adminBtn.classList.remove('hidden');
            } else {
                adminBtn.classList.add('hidden');
            }
        } else {
            userInfoEl.classList.add('hidden');
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            adminBtn.classList.add('hidden');
        }
        // Recarrega os projetos para atualizar o estado dos botões de voto
        loadProjects();
    }

    // --- Voting System ---
    async function getUserVote(userId) {
        if (!userId) return null;
        const { data, error } = await _supabase
            .from('votes')
            .select('project_id')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = 'single row not found'
            console.error('Erro ao buscar voto do usuário:', error);
            return null;
        }
        return data ? data.project_id : null;
    }

    window.handleVote = async (projectId) => {
        if (!currentUser) {
            showNotification('Faça login para votar!', 'error');
            openAuthModal();
            return;
        }

        const existingVote = await getUserVote(currentUser.id);
        if (existingVote) {
            showNotification('Você já votou em um projeto!', 'error');
            return;
        }

        const { error } = await _supabase
            .from('votes')
            .insert({ project_id: projectId, user_id: currentUser.id });

        if (error) {
            showNotification('Erro ao registrar voto: ' + error.message, 'error');
            console.error('Erro ao votar:', error);
        } else {
            showNotification('Voto registrado com sucesso!', 'success');
            // A atualização em tempo real cuidará de recarregar os projetos
        }
    };

    // --- Project Loading ---
    async function loadProjects() {
        const { data: projects, error } = await _supabase
            .from('projects_with_votes') // Usando a view com contagem de votos
            .select('*')
            .order('votes', { ascending: false });

        if (error) {
            console.error('Erro ao carregar projetos:', error);
            projectsGrid.innerHTML = '<p>Não foi possível carregar os projetos.</p>';
            return;
        }
        
        const userVoteId = currentUser ? await getUserVote(currentUser.id) : null;
        projectsGrid.innerHTML = projects.map(project => createProjectCard(project, userVoteId)).join('');
    }

    function createProjectCard(project, userVoteId) {
        const hasVotedForThis = userVoteId === project.id;
        const canVote = !userVoteId;

        let btnHtml;
        if (hasVotedForThis) {
            btnHtml = `<button class="vote-btn voted" disabled><i class="fas fa-check"></i> Votado</button>`;
        } else if (canVote) {
            btnHtml = `<button class="vote-btn" onclick="window.handleVote(${project.id})">Votar</button>`;
        } else {
            btnHtml = `<button class="vote-btn" disabled>Você já votou</button>`;
        }

        return `
            <div class="project-card" style="animation-delay: ${Math.random() * 0.3}s">
                <img src="${project.image}" alt="${project.name}" class="project-image">
                <div class="project-content">
                    <h3 class="project-title">${project.name}</h3>
                    <p class="project-author"><i class="fas fa-user-graduate"></i> ${project.author} • ${project.category}</p>
                    <p class="project-description">${project.description}</p>
                    <div class="project-footer">
                        <span class="vote-count"><i class="fas fa-heart"></i> ${project.votes} votos</span>
                        ${btnHtml}
                    </div>
                    ${project.link ? `
                        <a href="${project.link}" target="_blank" class="btn btn-outline" style="width: 100%; margin-top: 1rem;">
                            <i class="fas fa-external-link-alt"></i> Ver Projeto Completo
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // --- Real-time Updates ---
    function subscribeToChanges() {
        _supabase.channel('public:projects')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, loadProjects)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, loadProjects)
            .subscribe();
    }

    // --- Modal Functions ---
    function openAuthModal() {
        if (authModal) authModal.classList.add('active');
    }

    function closeAuthModal() {
        if (authModal) authModal.classList.remove('active');
    }

    // --- Event Listeners ---
    loginBtn.addEventListener('click', openAuthModal);
    logoutBtn.addEventListener('click', handleLogout);
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
    
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeAuthModal();
        });
        authModal.querySelector('.close-modal').addEventListener('click', closeAuthModal);
    }

    // --- Initialization ---
    auth.onAuthStateChange(async (_event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            userProfile = await getProfile(currentUser.id);
            closeAuthModal();
        } else {
            currentUser = null;
            userProfile = null;
        }
        updateUI();
    });

    updateCountdown();
    setInterval(updateCountdown, 60000);
    subscribeToChanges(); // Inicia a escuta por atualizações em tempo real
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

    // Adiciona a animação de slideOut se ela não existir
    if (!document.styleSheets[0].cssRules.namedItem('slideOut')) {
        try {
            document.styleSheets[0].insertRule(`
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(110%); opacity: 0; }
                }
            `, document.styleSheets[0].cssRules.length);
        } catch (e) {
            console.warn("Não foi possível adicionar a regra de animação 'slideOut'.", e);
        }
    }
}
