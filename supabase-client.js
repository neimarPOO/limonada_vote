// =================================================================================
// Supabase Client
// =================================================================================

// Importa as funções do Supabase a partir do CDN global
const { createClient } = supabase;

// URL e Chave Anônima do seu projeto Supabase
const supabaseUrl = 'https://bciwrauxgdyaculyxkgu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXdyYXV4Z2R5YWN1bHl4a2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTQ4NDgsImV4cCI6MjA3ODIzMDg0OH0.TLXkZfQnmbBTJ5XxXQ3M8Xfwp5w3IjaPgy4rhkou98E';

// Cria e exporta o cliente Supabase para ser usado em outros arquivos
const _supabase = createClient(supabaseUrl, supabaseKey);

// Exemplo de como usar o cliente em outros arquivos:
//
// document.addEventListener('DOMContentLoaded', async () => {
//     const { data: projects, error } = await _supabase.from('projects').select('*');
//     if (error) console.error('Error fetching projects:', error);
//     else console.log('Projects:', projects);
// });
