// =================================================================================
// Supabase Client
// =================================================================================

// Importa as funções do Supabase a partir do CDN global
const { createClient } = supabase;

// URL e Chave Anônima do seu projeto Supabase
const supabaseUrl = 'https://bciwrauxgdyaculyxkgu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXdyYXV4Z2R5YWN1bHl4a2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTQ4NDgsImV4cCI6MjA3ODIzMDg0OH0.TLXkZfQnmbBTJ5XxXQ3M8Xfwp5w3IjaPgy4rhkou98E';

// Cria e exporta o cliente Supabase para ser usado em outros arquivos
const _supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // Redireciona o usuário para a página principal após o login
        redirectTo: window.location.origin,
    },
});

// --- Funções Auxiliares de Autenticação ---

const auth = {
    /**
     * Inicia o processo de login com o Google.
     */
    signInWithGoogle: () => {
        return _supabase.auth.signInWithOAuth({
            provider: 'google',
        });
    },

    /**
     * Realiza o logout do usuário.
     */
    signOut: () => {
        return _supabase.auth.signOut();
    },

    /**
     * Retorna a sessão do usuário atual, se existir.
     * @returns {Promise<Object|null>}
     */
    getSession: async () => {
        const { data, error } = await _supabase.auth.getSession();
        if (error) {
            console.error('Erro ao buscar sessão:', error);
            return null;
        }
        return data.session;
    },

    /**
     * Retorna os dados do usuário logado.
     * @returns {Object|null}
     */
    user: () => {
        const session = _supabase.auth.getSession();
        return session?.user || null;
    },

    /**
     * Observa mudanças no estado de autenticação (login/logout).
     * @param {Function} callback - Função a ser chamada quando o estado mudar.
     * @returns {Object} A subscrição, com um método .unsubscribe()
     */
    onAuthStateChange: (callback) => {
        return _supabase.auth.onAuthStateChange(callback);
    }
};

/**
 * Busca o perfil de um usuário (incluindo sua role).
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<Object|null>} O perfil do usuário.
 */
async function getProfile(userId) {
    if (!userId) return null;
    
    const { data, error } = await _supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Erro ao buscar perfil:', error.message);
        return null;
    }
    
    return data;
}
