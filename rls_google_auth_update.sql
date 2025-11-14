-- =================================================================
-- SCRIPT DE ATUALIZAÇÃO DAS POLÍTICAS DE RLS (Row Level Security)
-- PARA AUTENTICAÇÃO VIA GOOGLE (VERSÃO CORRIGIDA)
--
-- O que este script faz:
-- 1. Corrige o erro de tipo (uuid vs text) da versão anterior.
-- 2. Remove as políticas antigas e permissivas para votos e avaliações.
-- 3. Cria novas políticas que exigem que o usuário esteja autenticado
--    e só possa modificar seus próprios dados.
--
-- COMO USAR:
-- 1. Vá para o seu projeto no Supabase.
-- 2. Navegue até o "SQL Editor".
-- 3. Cole todo o conteúdo deste arquivo e clique em "RUN".
-- =================================================================

-- -----------------------------------------------------------------
-- Tabela 'votes'
-- -----------------------------------------------------------------

-- 1. Remove as políticas antigas para uma configuração limpa.
DROP POLICY IF EXISTS "Allow all users to insert votes" ON public.votes;
DROP POLICY IF EXISTS "Allow all users to read votes" ON public.votes;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own vote" ON public.votes;
DROP POLICY IF EXISTS "Allow authenticated users to read their own votes" ON public.votes;

-- 2. (NOVA CORRIGIDA) Permite que um usuário autenticado insira um voto PARA SI MESMO.
--    Adicionado type cast `::text` para comparar o uuid do auth com a coluna de texto.
CREATE POLICY "Allow authenticated users to insert their own vote"
ON public.votes
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- 3. (NOVA CORRIGIDA) Permite que um usuário autenticado leia APENAS os seus próprios votos.
CREATE POLICY "Allow authenticated users to read their own votes"
ON public.votes
FOR SELECT
USING (auth.uid()::text = user_id);


-- -----------------------------------------------------------------
-- Tabela 'ratings'
-- -----------------------------------------------------------------

-- 1. Remove todas as políticas de segurança anteriores da tabela 'ratings' para uma configuração limpa.
DROP POLICY IF EXISTS "Allow all users to upsert ratings" ON public.ratings;
DROP POLICY IF EXISTS "Allow all users to read ratings" ON public.ratings;
DROP POLICY IF EXISTS "Allow anonymous users to insert ratings" ON public.ratings;
DROP POLICY IF EXISTS "Allow anonymous users to update their ratings" ON public.ratings;
DROP POLICY IF EXISTS "Allow authenticated users to upsert their own rating" ON public.ratings;


-- 2. (NOVA) Permite que TODOS leiam todas as avaliações (a média é pública e não contém dados sensíveis).
CREATE POLICY "Allow all users to read ratings"
ON public.ratings
FOR SELECT
USING (true);

-- 3. (NOVA CORRIGIDA) Permite que um usuário autenticado insira ou atualize uma avaliação PARA SI MESMO.
--    Adicionado type cast `::text` para a comparação.
CREATE POLICY "Allow authenticated users to upsert their own rating"
ON public.ratings
FOR ALL
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- NOTA: As políticas para administradores (DELETE) e para as tabelas 'projects' e 'sessions' não precisam de alteração
-- e continuarão funcionando como antes.