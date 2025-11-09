// =================================================================================
// Admin Page Logic
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let userProfile = null;

    // --- Auth Guard ---
    auth.onAuthStateChange(async (_event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            userProfile = await getProfile(currentUser.id);

            if (!userProfile || userProfile.role !== 'admin') {
                alert('Acesso negado. Você precisa ser um administrador para ver esta página.');
                window.location.href = 'index.html';
                return;
            }
            
            // Se for admin, continue a inicialização
            initializeApp();

        } else {
            currentUser = null;
            userProfile = null;
            alert('Acesso negado. Faça o login como administrador.');
            window.location.href = 'index.html';
        }
    });

    function initializeApp() {
        // --- DOM Elements ---
        const projectForm = document.getElementById('projectForm');
        const formTitle = document.getElementById('formTitle');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const resetVotingBtn = document.getElementById('resetVotingBtn');
        const adminProjectsGrid = document.getElementById('adminProjectsGrid');
        const rankingTable = document.getElementById('rankingTable');
        const totalProjectsEl = document.getElementById('totalProjects');
        const totalVotesEl = document.getElementById('totalVotes');
        const activeVotersEl = document.getElementById('activeVoters');
        const avgVotesEl = document.getElementById('avgVotes');
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatar');
        const userInfoEl = document.querySelector('.user-info');
        const logoutBtn = document.getElementById('logoutBtn');

        // --- Initial UI Update ---
        function updateAdminUI() {
            if (currentUser && userProfile) {
                userInfoEl.classList.remove('hidden');
                userNameEl.textContent = (currentUser.user_metadata.full_name || userProfile.full_name).split(' ')[0];
                userAvatarEl.src = currentUser.user_metadata.avatar_url || userProfile.avatar_url;
                logoutBtn.classList.remove('hidden');
            }
        }

        // --- Main Functions ---
        async function loadDashboard() {
            const { data: projects, error: prjError } = await _supabase.from('projects_with_votes').select('*');
            const { data: votes, error: vtError } = await _supabase.from('votes').select('id, user_id', { count: 'exact' });

            if (prjError || vtError) {
                console.error('Erro ao carregar dashboard:', prjError || vtError);
                return;
            }

            const totalProjects = projects.length;
            const totalVotes = votes.length;
            const activeVoters = new Set(votes.map(v => v.user_id)).size;
            const avgVotes = totalProjects > 0 ? (totalVotes / totalProjects).toFixed(1) : 0;

            totalProjectsEl.textContent = totalProjects;
            totalVotesEl.textContent = totalVotes;
            activeVotersEl.textContent = activeVoters;
            avgVotesEl.textContent = avgVotes;

            loadRanking(projects, totalVotes);
        }

        function loadRanking(projects, totalVotes) {
            const sortedProjects = [...projects].sort((a, b) => b.votes - a.votes);

            rankingTable.innerHTML = sortedProjects.map((project, index) => {
                const percentage = totalVotes > 0 ? ((project.votes / totalVotes) * 100).toFixed(1) : 0;
                const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other';

                return `
                    <tr>
                        <td><div class="rank-badge ${rankClass}">${index + 1}</div></td>
                        <td><strong>${project.name}</strong><br><small>${project.category}</small></td>
                        <td>${project.author}</td>
                        <td><span style="font-weight: 700; color: var(--primary);"><i class="fas fa-heart"></i> ${project.votes}</span></td>
                        <td>${percentage}%</td>
                        <td>
                            <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="window.editProject(${project.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="window.deleteProject(${project.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        async function loadAdminProjects() {
            const { data: projects, error } = await _supabase.from('projects_with_votes').select('*').order('created_at', { ascending: false });
            if (error) {
                console.error("Erro ao carregar projetos para admin:", error);
                return;
            }

            adminProjectsGrid.innerHTML = projects.map((project, index) => `
                <div class="project-card" style="animation-delay: ${index * 0.1}s">
                    <img src="${project.image}" alt="${project.name}" class="project-image">
                    <div class="project-content">
                        <h3 class="project-title">${project.name}</h3>
                        <p class="project-author"><i class="fas fa-user-graduate"></i> ${project.author} • ${project.category}</p>
                        <div class="project-footer">
                            <span class="vote-count"><i class="fas fa-heart"></i> ${project.votes} votos</span>
                        </div>
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <button class="btn btn-primary" style="flex: 1;" onclick="window.editProject(${project.id})">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-outline" style="flex: 1;" onclick="window.deleteProject(${project.id})">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // --- Project CRUD ---
        window.editProject = async (projectId) => {
            const { data: project, error } = await _supabase.from('projects').select('*').eq('id', projectId).single();
            if (error || !project) {
                showNotification('Erro ao buscar projeto para edição.', 'error');
                return;
            }

            formTitle.textContent = 'Editar Projeto';
            projectForm.elements.projectId.value = project.id;
            projectForm.elements.projectName.value = project.name;
            projectForm.elements.projectAuthor.value = project.author;
            projectForm.elements.projectCategory.value = project.category;
            projectForm.elements.projectDescription.value = project.description;
            projectForm.elements.projectImage.value = project.image;
            projectForm.elements.projectLink.value = project.link || '';
            cancelEditBtn.style.display = 'inline-block';

            switchTab('add');
            showNotification('Editando projeto. Não se esqueça de salvar!', 'info');
        };

        window.deleteProject = async (projectId) => {
            if (!confirm('Tem certeza que deseja excluir este projeto? Esta ação é irreversível e também apagará todos os votos associados.')) return;

            const { error } = await _supabase.from('projects').delete().eq('id', projectId);

            if (error) {
                showNotification('Erro ao excluir projeto: ' + error.message, 'error');
            } else {
                showNotification('Projeto excluído com sucesso!', 'success');
            }
            // A atualização em tempo real cuidará do resto.
        };

        async function handleFormSubmit(e) {
            e.preventDefault();
            const editingId = projectForm.elements.projectId.value;
            const projectData = {
                name: projectForm.elements.projectName.value,
                author: projectForm.elements.projectAuthor.value,
                category: projectForm.elements.projectCategory.value,
                description: projectForm.elements.projectDescription.value,
                image: projectForm.elements.projectImage.value,
                link: projectForm.elements.projectLink.value,
            };

            let response;
            if (editingId) {
                response = await _supabase.from('projects').update(projectData).eq('id', editingId);
            } else {
                response = await _supabase.from('projects').insert(projectData);
            }

            if (response.error) {
                showNotification('Erro ao salvar projeto: ' + response.error.message, 'error');
            } else {
                showNotification(`Projeto ${editingId ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
                resetForm();
                switchTab('dashboard');
            }
        }

        function resetForm() {
            formTitle.textContent = 'Adicionar Novo Projeto';
            projectForm.reset();
            projectForm.elements.projectId.value = '';
            cancelEditBtn.style.display = 'none';
        }

        // --- Settings ---
        async function handleResetVoting() {
            if (!confirm('ATENÇÃO!\n\nVocê tem certeza que deseja zerar TODA a votação?\n\nEsta ação é IRREVERSÍVEL.')) return;

            const { error } = await _supabase.from('votes').delete().neq('id', 0); // Deleta todas as linhas

            if (error) {
                showNotification('Erro ao zerar votação: ' + error.message, 'error');
            } else {
                showNotification('Votação zerada com sucesso!', 'success');
            }
        }

        // --- Tab Navigation ---
        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            const tabButton = document.querySelector(`.tab[data-tab="${tabName}"]`);
            const tabContent = document.getElementById(tabName);

            if (tabButton) tabButton.classList.add('active');
            if (tabContent) tabContent.classList.add('active');
        }

        document.querySelector('.admin-tabs').addEventListener('click', (e) => {
            if (e.target.matches('.tab')) {
                const tabName = e.target.dataset.tab;
                switchTab(tabName);
            }
        });

        // --- Real-time Subscriptions ---
        function subscribeToChanges() {
            _supabase.channel('public:projects')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
                    loadDashboard();
                    loadAdminProjects();
                })
                .subscribe();
            
            _supabase.channel('public:votes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, loadDashboard)
                .subscribe();
        }

        // --- Event Listeners ---
        projectForm.addEventListener('submit', handleFormSubmit);
        cancelEditBtn.addEventListener('click', resetForm);
        resetVotingBtn.addEventListener('click', handleResetVoting);
        document.getElementById('addProjectBtn').addEventListener('click', () => {
            resetForm();
            switchTab('add');
        });
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            window.location.href = 'index.html';
        });

        // --- Initial Load ---
        updateAdminUI();
        loadDashboard();
        loadAdminProjects();
        subscribeToChanges();
    }
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