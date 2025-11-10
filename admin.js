// =================================================================================
// Admin Page Logic (Anonymous Sessions with MULTIPLE Image Upload)
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // A senha não é mais hardcoded aqui, é verificada por uma Netlify Function
    const passwordModal = document.getElementById('passwordModal');
    const passwordForm = document.getElementById('passwordForm');
    const passwordError = document.getElementById('passwordError');
    const adminWrapper = document.getElementById('admin-wrapper');

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const enteredPassword = e.target.elements.adminPassword.value;

        // Chama a Netlify Function para verificar a senha
        const response = await fetch('/.netlify/functions/verify-admin-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: enteredPassword }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            passwordModal.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => passwordModal.classList.remove('active'), 300);
            adminWrapper.style.display = 'block';
            initializeApp();
        } else {
            passwordError.textContent = data.message || 'Senha incorreta. Tente novamente.';
            passwordError.style.display = 'block';
            e.target.elements.adminPassword.value = '';
            e.target.elements.adminPassword.focus();
        }
    });

    if (!document.styleSheets[0] || !document.styleSheets[0].cssRules.namedItem('fadeOut')) {
        try {
            document.styleSheets[0].insertRule(`@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }`, document.styleSheets[0].cssRules.length);
        } catch (e) { console.warn("Could not add fadeOut animation rule, likely due to CORS policy.", e); }
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
            const { data: sessionData, error: sessionError } = await _supabase
                .from('sessions')
                .select('session_uuid')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1);

            if (sessionError) {
                console.error('Erro ao buscar sessão ativa:', sessionError);
            }
            
            const activeSession = (sessionData && sessionData.length > 0) ? sessionData[0] : null;
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
                        <td data-label="Rank"><div class="rank-badge ${rankClass}">${index + 1}</div></td>
                        <td data-label="Projeto"><strong>${project.name}</strong><br><small>${project.category}</small></td>
                        <td data-label="Autor">${project.author}</td>
                        <td data-label="Votos"><span style="font-weight: 700; color: var(--primary);"><i class="fas fa-heart"></i> ${project.votes}</span></td>
                        <td data-label="%">${percentage}%</td>
                        <td data-label="Ações">
                            <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="window.editProject(${project.id})"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="window.deleteProject(${project.id})"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        async function loadAdminProjects() {
            // Busca direto da tabela de projetos para garantir que todos apareçam sempre.
            const { data: projects, error } = await _supabase.from('projects').select('*').order('created_at', { ascending: false });
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
                        <div class="project-footer"><span class="vote-count">ID: ${project.id}</span></div>
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

                    

                    // Primeiro, pegue as URLs dos arquivos para deletá-los do storage

                    const { data: project, error: fetchError } = await _supabase.from('projects').select('image, pdf_url').eq('id', projectId).single();

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

        

                    // Se o projeto foi deletado, apague os arquivos do storage

                    if (project.image && project.image.length > 0) {

                        const filePaths = project.image.map(url => new URL(url).pathname.split('/project-images/')[1]);

                        await _supabase.storage.from('project-images').remove(filePaths);

                    }

                    if (project.pdf_url) {

                        const pdfPath = new URL(project.pdf_url).pathname.split('/project-pdfs/')[1];

                        await _supabase.storage.from('project-pdfs').remove([pdfPath]);

                    }

        

                    showNotification('Projeto excluído com sucesso!', 'success');

                };

        

                async function handleFormSubmit(e) {

                    e.preventDefault();

                    showNotification('Salvando projeto...', 'info');

        

                    const editingId = projectForm.elements.projectId.value;

                    

                    // --- Lógica de Upload de Imagem ---

                    const newImageFiles = projectForm.elements.projectImageFile.files;

                    let existingImageUrls = projectForm.elements.existingImageUrls.value ? JSON.parse(projectForm.elements.existingImageUrls.value) : [];

                    let finalImageUrls = [...existingImageUrls];

        

                    if (newImageFiles.length > 0) {

                        if (existingImageUrls.length > 0) {

                            const oldFilePaths = existingImageUrls.map(url => new URL(url).pathname.split('/project-images/')[1]);

                            await _supabase.storage.from('project-images').remove(oldFilePaths);

                        }

                        finalImageUrls = [];

                        const uploadPromises = Array.from(newImageFiles).map(async (file) => {

                            const filePath = `public/${Date.now()}-${file.name}`;

                            const { error: uploadError } = await _supabase.storage.from('project-images').upload(filePath, file);

                            if (uploadError) throw uploadError;

                            const { data: urlData } = _supabase.storage.from('project-images').getPublicUrl(filePath);

                            return urlData.publicUrl;

                        });

                        try {

                            finalImageUrls = await Promise.all(uploadPromises);

                        } catch (error) {

                            showNotification('Erro no upload de imagens: ' + error.message, 'error');

                            return;

                        }

                    }

        

                    // --- Lógica de Upload de PDF ---

                    const newPdfFile = projectForm.elements.projectPdfFile.files[0];

                    let existingPdfUrl = projectForm.elements.existingPdfUrl.value;

                    let finalPdfUrl = existingPdfUrl;

        

                    if (newPdfFile) {

                        if (existingPdfUrl) {

                            const oldPdfPath = new URL(existingPdfUrl).pathname.split('/project-pdfs/')[1];

                            await _supabase.storage.from('project-pdfs').remove([oldPdfPath]);

                        }

                                        const pdfFilePath = `public/${Date.now()}-${encodeURIComponent(newPdfFile.name)}`;

                                        const { error: pdfUploadError } = await _supabase.storage.from('project-pdfs').upload(pdfFilePath, newPdfFile);

                        if (pdfUploadError) {

                            showNotification('Erro no upload do PDF: ' + pdfUploadError.message, 'error');

                            return;

                        }

                        const { data: pdfUrlData } = _supabase.storage.from('project-pdfs').getPublicUrl(pdfFilePath);

                        finalPdfUrl = pdfUrlData.publicUrl;

                    }

        

                    const projectData = {

                        name: projectForm.elements.projectName.value,

                        author: projectForm.elements.projectAuthor.value,

                        category: projectForm.elements.projectCategory.value,

                        description: projectForm.elements.projectDescription.value,

                        link: projectForm.elements.projectLink.value,

                        image: finalImageUrls.length > 0 ? finalImageUrls : null,

                        pdf_url: finalPdfUrl || null,

                    };

        

                    const { error } = editingId

                        ? await _supabase.from('projects').update(projectData).eq('id', editingId)

                        : await _supabase.from('projects').insert(projectData);

        

                    if (error) {

                        showNotification('Erro ao salvar projeto: ' + error.message, 'error');

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

                    projectForm.elements.existingImageUrls.value = '';

                    projectForm.elements.existingPdfUrl.value = '';

                    imagePreviewContainer.innerHTML = '';

                    document.getElementById('pdfPreview').innerHTML = '';

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

        

                function updatePdfPreview(pdfUrl) {

                    const pdfPreview = document.getElementById('pdfPreview');

                    if (pdfUrl) {

                        const fileName = pdfUrl.split('/').pop();

                        pdfPreview.innerHTML = `<i class="fas fa-file-pdf"></i> ${fileName.substring(fileName.indexOf('-') + 1)}`;

                    } else {

                        pdfPreview.innerHTML = '';

                    }

                }

        

                        // --- Settings ---

        

                        async function handleStartNewVoting(e) {

        

                            e.preventDefault();

        

                            if (!confirm('ATENÇÃO!\n\nVocê está prestes a iniciar uma NOVA sessão de votação.')) return;

        

                

        

                            const days = parseInt(document.getElementById('session_days').value) || 0;

        

                            const hours = parseInt(document.getElementById('session_hours').value) || 0;

        

                            const minutes = parseInt(document.getElementById('session_minutes').value) || 0;

        

                

        

                            const totalMilliseconds = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);

        

                

        

                            if (totalMilliseconds <= 0) {

        

                                showNotification('A duração da sessão deve ser maior que zero.', 'error');

        

                                return;

        

                            }

        

                

        

                                        const ends_at = new Date(Date.now() + totalMilliseconds).toISOString();

        

                

        

                            

        

                

        

                                        // Desativa a sessão antiga

        

                

        

                                        await _supabase.from('sessions').update({ is_active: false }).eq('is_active', true);

        

                

        

                                        

        

                

        

                                        // Insere a nova sessão, marcando-a explicitamente como ativa

        

                

        

                                        const { error } = await _supabase.from('sessions').insert({ ends_at: ends_at, is_active: true });

        

                

        

                            

        

                

        

                                        if (error) {

        

                

        

                                            showNotification('Erro ao criar nova sessão: ' + error.message, 'error');

        

                

        

                                        } else {

        

                

        

                                            showNotification('Nova sessão de votação iniciada com sucesso!', 'success');

        

                

        

                                        }

        

                

        

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

        

                        document.getElementById('newSessionForm').addEventListener('submit', handleStartNewVoting);

        

                        

        

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

        

                document.getElementById('projectPdfFile').addEventListener('change', (e) => {

                    const file = e.target.files[0];

                    if (file) {

                        updatePdfPreview(file.name);

                    }

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

        

                notification.remove();

        

            }, 4000); // Notification stays for 4 seconds

        

        }

        

        

        