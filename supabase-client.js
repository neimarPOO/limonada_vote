// =================================================================================
// Supabase Client
// =================================================================================

// Importa as funções do Supabase a partir do CDN global
const { createClient } = supabase;

// As chaves são carregadas a partir do arquivo config.js (que não está no Git)
const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : "";
const supabaseKey = typeof SUPABASE_KEY !== 'undefined' ? SUPABASE_KEY : "";

// Cria e exporta o cliente Supabase para ser usado em outros arquivos
let _supabase;

if (supabaseUrl && supabaseKey) {
    _supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.error("Supabase URL ou Key não encontradas. Verifique se o arquivo config.js está presente e configurado corretamente.");
    // Exibe uma mensagem de erro na tela para o usuário final
    document.body.innerHTML = `<div style="padding: 2rem; text-align: center; font-family: sans-serif;">
        <h1>Erro de Configuração</h1>
        <p>A conexão com o banco de dados não pôde ser estabelecida. As chaves do Supabase não foram encontradas.</p>
        <p>Por favor, verifique o console para mais detalhes.</p>
    </div>`;
}

// Torna as chaves acessíveis globalmente para re-inicialização em outros scripts
window.supabaseUrl = supabaseUrl;
window.supabaseKey = supabaseKey;

