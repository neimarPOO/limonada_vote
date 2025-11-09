# Documento de Requisitos do Produto (PRD): Limonada Summit

**Autor:** Gemini
**Versão:** 1.0
**Data:** 9 de Novembro de 2025

---

## 1. Introdução e Visão Geral

O **Limonada Summit** é uma plataforma de votação online projetada para facilitar a eleição dos projetos mais inovadores em eventos escolares, como feiras de ciências e competições acadêmicas. A aplicação oferece uma interface moderna e em tempo real para que alunos, professores e visitantes possam participar ativamente do processo de votação, garantindo transparência, engajamento e segurança.

O sistema resolve o problema de votações manuais, que são muitas vezes lentas, propensas a erros e pouco transparentes. Com o Limonada Summit, a contagem de votos é automatizada e o ranking é atualizado instantaneamente, criando uma experiência dinâmica e confiável para todos os envolvidos.

## 2. Objetivos do Produto

*   **Engajamento:** Aumentar a participação da comunidade escolar (alunos, pais, professores) no evento, permitindo que todos votem de forma fácil e rápida.
*   **Transparência:** Fornecer um ranking em tempo real que mostre a popularidade de cada projeto, eliminando dúvidas sobre a contagem de votos.
*   **Eficiência Administrativa:** Simplificar o trabalho dos organizadores do evento, oferecendo um painel de controle centralizado para gerenciar os projetos e monitorar a votação.
*   **Segurança e Justiça:** Garantir que cada usuário possa votar apenas uma vez, prevenindo fraudes e assegurando uma competição justa.

## 3. Personas de Usuário

1.  **Votante (Aluno, Visitante, Pai)**
    *   **Necessidades:** Quer visualizar os projetos de forma clara, entender as propostas e votar no seu favorito de maneira simples e segura. Gosta de ver o impacto do seu voto no ranking.
    *   **Jornada:** Acessa a página, faz login com sua conta Google, explora a lista de projetos, clica para votar e acompanha a atualização do ranking.

2.  **Administrador (Professor, Organizador do Evento)**
    *   **Necessidades:** Precisa de uma forma eficiente para cadastrar, editar e remover projetos antes e durante o evento. Quer monitorar as estatísticas da votação (total de votos, ranking) e ter a capacidade de iniciar ou zerar uma sessão de votação.
    *   **Jornada:** Acessa a página de admin, faz login com sua conta de administrador, gerencia os projetos através de um formulário, acompanha o dashboard com métricas em tempo real e, ao final, utiliza os dados para anunciar os vencedores.

## 4. Requisitos Funcionais

### 4.1. Funcionalidades para Votantes

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| F01| Visualização de Projetos | A página principal deve exibir todos os projetos em um layout de grade, mostrando imagem, nome, autor, categoria e descrição. | Essencial |
| F02| Autenticação de Usuário | O usuário deve poder fazer login de forma segura utilizando sua conta Google (OAuth 2.0). | Essencial |
| F03| Sistema de Voto Único | Após o login, o usuário pode votar em **um único** projeto. Uma vez que o voto é registrado, o usuário não pode votar novamente. | Essencial |
| F04| Feedback de Voto | O usuário deve receber uma confirmação visual imediata de que seu voto foi computado com sucesso. O projeto votado deve ser destacado. | Essencial |
| F05| Contagem de Votos Visível | Cada projeto na grade deve exibir sua contagem atual de votos. | Essencial |
| F06| Contagem Regressiva | Um cronômetro regressivo deve ser exibido, indicando o tempo restante para o fim da votação. | Média |

### 4.2. Funcionalidades para Administradores

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| A01| Acesso Restrito ao Painel | A página de administração deve ser protegida e acessível apenas por usuários com a função (role) de "admin". | Essencial |
| A02| Dashboard de Métricas | O painel deve exibir estatísticas chave em tempo real: número total de projetos, número total de votos e número de votantes únicos. | Essencial |
| A03| Ranking em Tempo Real | O dashboard deve apresentar uma tabela com o ranking dos projetos, ordenados por número de votos, incluindo a porcentagem de votos de cada um. | Essencial |
| A04| Gerenciamento de Projetos (CRUD) | O admin deve poder **Criar, Ler, Atualizar e Excluir** projetos através de uma interface dedicada. | Essencial |
| A05| Zerar Votação | O admin deve ter a capacidade de apagar todos os registros de votos para iniciar uma nova competição, sem apagar os projetos cadastrados. A ação deve exigir confirmação. | Essencial |

## 5. Requisitos Não Funcionais

| ID | Requisito | Descrição |
|----|-----------|-----------|
| NFR01| **Segurança** | As credenciais de usuário e o acesso ao banco de dados devem ser gerenciados de forma segura pelo Supabase. As políticas de RLS (Row Level Security) devem ser aplicadas. |
| NFR02| **Desempenho** | A aplicação deve carregar rapidamente e as atualizações de votos devem aparecer em tempo real (< 3 segundos de latência). |
| NFR03| **Usabilidade** | A interface deve ser intuitiva, moderna e responsiva, funcionando bem em desktops e dispositivos móveis. |
| NFR04| **Escalabilidade** | A arquitetura baseada no Supabase deve suportar um aumento súbito no número de usuários e votos durante o pico do evento. |

## 6. Stack de Tecnologia

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **Backend e Banco de Dados (BaaS):** Supabase
    *   **Autenticação:** Supabase Auth (Google OAuth)
    *   **Banco de Dados:** Supabase (PostgreSQL)
    *   **APIs em Tempo Real:** Supabase Realtime Subscriptions
*   **Hospedagem:** Qualquer serviço de hospedagem de sites estáticos (ex: Vercel, Netlify, GitHub Pages).

## 7. Fora do Escopo (Versões Futuras)

*   Suporte a múltiplos provedores de login (ex: Facebook, E-mail/Senha).
*   Seção de comentários nos projetos.
*   Múltiplas rodadas ou categorias de votação.
*   Upload de imagens de projeto diretamente pela interface de admin (atualmente usa URL).
*   Perfis de usuário editáveis.
