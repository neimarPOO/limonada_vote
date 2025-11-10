// =================================================================================
// Admin Page Logic (Anonymous Sessions with MULTIPLE Image Upload)
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    const correctPassword = "pobresservos"; // Senha hardcoded temporariamente para evitar exposição via config.js
    const passwordModal = document.getElementById('passwordModal');
    const passwordForm = document.getElementById('passwordForm');
    const passwordError = document.getElementById('passwordError');
    const adminWrapper = document.getElementById('admin-wrapper');

    // Remove a verificação de !correctPassword, pois agora é hardcoded
    
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredPassword = e.target.elements.adminPassword.value;

        if (enteredPassword === correctPassword) {
            passwordModal.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => passwordModal.classList.remove('active'), 300);
            adminWrapper.style.display = 'block';
            initializeApp();
        } else {
            passwordError.style.display = 'block';
            e.target.elements.adminPassword.value = '';
            e.target.elements.adminPassword.focus();
        }
    });

    try {
        if (!document.styleSheets[0]?.cssRules.namedItem('fadeOut')) {
            document.styleSheets[0].insertRule(`@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }`, document.styleSheets[0].cssRules.length);
        }
    } catch (e) {
        console.warn("Could not add fadeOut animation rule, likely due to CORS policy.", e);
    }

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
        const projectImageFile = document.getElementById('projectImageFile');
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');

        // --- Main Functions ---
        async function loadDashboard() {
            const { data: activeSession, error: sessionError } = await _supabase.from('sessions').select('session_uuid').eq('is_active', true).single();
            if (sessionError && sessionError.code !== 'PGRST116') console.error('Erro ao buscar sessão ativa:', sessionError);
            const currentSessionUUID = activeSession?.session_uuid;

            const { data: projects, error: prjError } = await _supabase.from('projects_with_votes').select('*');
            const { data: votes, error: vtError, count: totalVotes } = await _supabase.from('votes').select('id, user_id', { count: 'exact' }).eq('session_uuid', currentSessionUUID);

            if (prjError || vtError) {
                console.error('Erro ao carregar dashboard:', prjError || vtError);
                return;
            }

            totalProjectsEl.textContent = projects.length;
            totalVotesEl.textContent = totalVotes;
            activeVotersEl.textContent = new Set(votes.map(v => v.user_id)).size;
            avgVotesEl.textContent = projects.length > 0 ? (totalVotes / projects.length).toFixed(1) : 0;

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
                            <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="window.editProject(${project.id})"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="window.deleteProject(${project.id})"><i class="fas fa-trash"></i></button>
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
            adminProjectsGrid.innerHTML = projects.map((project, index) => {
                const firstImage = (project.image && project.image[0]) ? project.image[0] : 'https://placehold.co/600x400?text=Sem+Imagem';
                return `
                <div class="project-card" style="animation-delay: ${index * 0.1}s">
                    <img src="${firstImage}" alt="${project.name}" class="project-image">
                    <div class="project-content">
                        <h3 class="project-title">${project.name}</h3>
                        <p class="project-author"><i class="fas fa-user-graduate"></i> ${project.author} • ${project.category}</p>
                        <div class="project-footer"><span class="vote-count"><i class="fas fa-heart"></i> ${project.votes} votos</span></div>
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <button class="btn btn-primary" style="flex: 1;" onclick="window.editProject(${project.id})"><i class="fas fa-edit"></i> Editar</button>
                            <button class="btn btn-outline" style="flex: 1;" onclick="window.deleteProject(${project.id})"><i class="fas fa-trash"></i> Excluir</button>
                        </div>
                    </div>
                </div>
            `}).join('');
        }

        // --- Project CRUD ---
        window.editProject = async (projectId) => {
            const { data: project, error } = await _supabase.from('projects').select('*').eq('id', projectId).single();
            if (error || !project) {
                showNotification('Erro ao buscar projeto para edição.', 'error');
                return;
            }
            resetForm();
            formTitle.textContent = 'Editar Projeto';
            projectForm.elements.projectId.value = project.id;
            projectForm.elements.projectName.value = project.name;
            projectForm.elements.projectAuthor.value = project.author;
            projectForm.elements.projectCategory.value = project.category;
            projectForm.elements.projectDescription.value = project.description;
            projectForm.elements.projectLink.value = project.link || '';
            
            if (project.image && Array.isArray(project.image)) {
                projectForm.elements.existingImageUrls.value = JSON.stringify(project.image);
                updateImagePreview(project.image);
            }
            
            cancelEditBtn.style.display = 'inline-block';
            switchTab('add');
            showNotification('Editando projeto. Enviar novos arquivos substituirá TODAS as imagens atuais.', 'info');
        };

        window.deleteProject = async (projectId) => {
            if (!confirm('Tem certeza que deseja excluir este projeto? Esta ação é irreversível.')) return;
            
            // Primeiro, pegue as URLs das imagens para deletá-las do storage
            const { data: project, error: fetchError } = await _supabase.from('projects').select('image').eq('id', projectId).single();
            if (fetchError) {
                showNotification('Erro ao buscar dados do projeto para exclusão.', 'error');
                return;
            }

            // Deleta o projeto do banco de dados
            const { error: deleteError } = await _supabase.from('projects').delete().eq('id', projectId);
            if (deleteError) {
                showNotification('Erro ao excluir projeto: ' + deleteError.message, 'error');
                return;
            }

            // Se o projeto foi deletado, apague as imagens do storage
            if (project.image && project.image.length > 0) {
                const filePaths = project.image.map(url => new URL(url).pathname.split('/project-images/')[1]);
                await _supabase.storage.from('project-images').remove(filePaths);
            }

            showNotification('Projeto excluído com sucesso!', 'success');
        };

        async function handleFormSubmit(e) {
            e.preventDefault();
            showNotification('Salvando projeto...', 'info');

            const editingId = projectForm.elements.projectId.value;
            const newFiles = projectForm.elements.projectImageFile.files;
            let existingUrls = projectForm.elements.existingImageUrls.value ? JSON.parse(projectForm.elements.existingImageUrls.value) : [];
            let finalImageUrls = [...existingUrls];

            if (newFiles.length > 0) {
                // Se há novos arquivos, substitui os antigos.
                // 1. Deleta as imagens antigas do storage
                if (existingUrls.length > 0) {
                    const oldFilePaths = existingUrls.map(url => new URL(url).pathname.split('/project-images/')[1]);
                    await _supabase.storage.from('project-images').remove(oldFilePaths);
                }

                // 2. Faz upload das novas imagens
                finalImageUrls = []; // Zera a lista para preencher com as novas
                const uploadPromises = Array.from(newFiles).map(async (file) => {
                    const filePath = `public/${Date.now()}-${file.name}`;
                    const { error: uploadError } = await _supabase.storage.from('project-images').upload(filePath, file);
                    if (uploadError) throw uploadError;
                    const { data: urlData } = _supabase.storage.from('project-images').getPublicUrl(filePath);
                    return urlData.publicUrl;
                });

                try {
                    finalImageUrls = await Promise.all(uploadPromises);
                } catch (error) {
                    showNotification('Erro no upload de uma ou mais imagens: ' + error.message, 'error');
                    return;
                }
            }

            if (finalImageUrls.length === 0) {
                showNotification('Nenhuma imagem fornecida. Por favor, envie ao menos um arquivo.', 'error');
                return;
            }

            const projectData = {
                name: projectForm.elements.projectName.value,
                author: projectForm.elements.projectAuthor.value,
                category: projectForm.elements.projectCategory.value,
                description: projectForm.elements.projectDescription.value,
                link: projectForm.elements.projectLink.value,
                image: finalImageUrls, // Salva o array de URLs
            };

            const { error } = editingId
                ? await _supabase.from('projects').update(projectData).eq('id', editingId)
                : await _supabase.from('projects').insert(projectData);

            if (error) {
                showNotification('Erro ao salvar projeto: ' + error.message, 'error');
            }
            else {
                showNotification(`Projeto ${editingId ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
                resetForm();
                switchTab('dashboard');
            }
        }

        function resetForm() {
            formTitle.textContent = 'Adicionar Novo Projeto';
            projectForm.reset();
            projectForm.elements.projectId.value = '';
            projectForm.elements.existingImageUrls.value = '';
            imagePreviewContainer.innerHTML = '';
            cancelEditBtn.style.display = 'none';
        }
        
        function updateImagePreview(sources) {
            imagePreviewContainer.innerHTML = '';
            sources.forEach(src => {
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                const img = document.createElement('img');
                img.src = src;
                previewItem.appendChild(img);
                imagePreviewContainer.appendChild(previewItem);
            });
        }

        // --- Settings ---
        async function handleStartNewVoting() {
            if (!confirm('ATENÇÃO!\n\nVocê está prestes a iniciar uma NOVA sessão de votação.')) return;
            await _supabase.from('sessions').update({ is_active: false }).eq('is_active', true);
            const { error } = await _supabase.from('sessions').insert({});
            if (error) showNotification('Erro ao criar nova sessão: ' + error.message, 'error');
            else showNotification('Nova sessão de votação iniciada com sucesso!', 'success');
        }

        // --- Tab Navigation & Event Listeners ---
        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const tabButton = document.querySelector(`.tab[data-tab="${tabName}"]`);
            const tabContent = document.getElementById(tabName);
            if (tabButton) tabButton.classList.add('active');
            if (tabContent) tabContent.classList.add('active');
        }

        projectForm.addEventListener('submit', handleFormSubmit);
        cancelEditBtn.addEventListener('click', resetForm);
        resetVotingBtn.addEventListener('click', handleStartNewVoting);
        
        document.querySelector('.admin-tabs').addEventListener('click', (e) => {
            if (e.target.matches('.tab')) {
                const tabName = e.target.dataset.tab;
                if (tabName === 'add') resetForm();
                switchTab(tabName);
            }
        });

        projectImageFile.addEventListener('change', () => {
            const files = Array.from(projectImageFile.files);
            const fileUrls = files.map(file => URL.createObjectURL(file));
            updateImagePreview(fileUrls);
        });

        // --- Real-time Subscriptions & Initial Load ---
        function subscribeToChanges() {
            _supabase.channel('public-admin-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => { loadDashboard(); loadAdminProjects(); })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, loadDashboard)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, loadDashboard)
                .subscribe();
        }

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

    try {
        // Check if the rule already exists to avoid re-inserting
        let ruleExists = false;
        for (const sheet of document.styleSheets) {
            // Wrap rule access in another try-catch for cross-origin sheets
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.name === 'slideOut') {
                        ruleExists = true;
                        break;
                    }
                }
            } catch (e) {
                // Ignore CORS errors on foreign stylesheets
            }
            if (ruleExists) break;
        }

        if (!ruleExists) {
            // Find the first local stylesheet to insert the rule
            for (const sheet of document.styleSheets) {
                if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
                    sheet.insertRule(`@keyframes slideOut { from { transform: translateX(0); } to { transform: translateX(110%); opacity: 0; } }`, sheet.cssRules.length);
                    break;
                }
            }
        }
    } catch (e) {
        console.warn("Could not add slideOut animation rule.", e);
    }
}