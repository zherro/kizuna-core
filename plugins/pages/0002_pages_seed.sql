-- plugins/pages/0002_pages_seed.sql
--
-- Default institutional-pages seed, shipped WITH the `pages` plugin so a fresh install
-- isn't an empty site. The content here is deliberately project-neutral: it refers to
-- "a plataforma" / "nossa plataforma" and never names a real brand. A consuming project
-- is expected to edit these pages in the admin UI at `/painel/administracao/paginas`,
-- or to override them with its own seed (e.g. foco-total's db/extras/pages_seed.sql).
--
-- This file is DATA ONLY: it does not touch auth.plugin_registry / auth.permissions
-- (0001 already did that) and does not bump the plugin version.
--
-- Idempotent: re-running does not duplicate rows (ON CONFLICT ON CONSTRAINT
-- pages_tenant_slug_unique DO NOTHING).
--
-- Applied automatically right after 0001_pages.sql by the installer's widened
-- NNNN_*.sql glob (scripts/install.sh), which expands matches in filename order.
--
-- Tenant/user resolution: `pages.tenant_id` and `pages.created_by` are NOT NULL with
-- FKs. On a truly fresh DB there may be NO users/tenants yet at plugin-install time.
-- The INSERT below resolves the first root user and the tenant they own via
-- INNER `JOIN LATERAL (...) ON true`; when either subquery yields no row the join
-- produces zero rows and the whole INSERT is a silent no-op (never NULL into a NOT
-- NULL column, never an error).

INSERT INTO public.pages (slug, title, description, content, status, active, tenant_id, created_by)
SELECT
    v.slug,
    v.title,
    v.description,
    v.content,
    'published',
    true,
    t.uid,
    u.uid
FROM (VALUES
    (
        'sobre',
        'Sobre',
        'Conheça a plataforma, o que ela oferece e como ela funciona.',
        $md$# Sobre

Bem-vindo à nossa plataforma. Este é um espaço criado para conectar pessoas que
precisam de um serviço a profissionais e empresas prontos para atendê-las.

## O que oferecemos

A plataforma reúne, em um só lugar, anúncios de serviços de diferentes categorias.
Quem procura pode comparar opções, ver detalhes e entrar em contato diretamente com
quem oferece o serviço. Quem anuncia ganha visibilidade e novos clientes.

## Como funciona

- **Para quem procura:** navegue pelas categorias ou use a busca, abra os anúncios
  que chamarem sua atenção e fale com o anunciante.
- **Para quem anuncia:** crie sua conta, cadastre seus serviços com fotos e
  descrição, e acompanhe os contatos pelo painel.

## Nosso compromisso

Trabalhamos para manter um ambiente organizado, transparente e seguro, em que a
informação apresentada seja clara e as regras valham para todos. A plataforma está
em evolução contínua, e o retorno de quem a utiliza orienta cada melhoria.
$md$
    ),
    (
        'quem-somos',
        'Quem somos',
        'Nossa missão, nossos valores e a forma como pensamos a plataforma.',
        $md$# Quem somos

Somos uma equipe dedicada a facilitar o encontro entre quem precisa de um serviço e
quem sabe prestá-lo. Acreditamos que a tecnologia deve simplificar esse caminho, e
não complicá-lo.

## Nossa missão

Aproximar pessoas e negócios de forma simples, dando a profissionais de todos os
portes a chance de mostrar seu trabalho e a clientes a tranquilidade de escolher
bem.

## Nossos valores

- **Transparência:** informações claras, sem letras miúdas.
- **Respeito:** tratamos usuários, anunciantes e parceiros com a mesma consideração.
- **Simplicidade:** cada recurso existe para resolver um problema real.
- **Melhoria contínua:** ouvimos quem usa a plataforma e evoluímos a partir disso.

## Para onde vamos

Seguimos ampliando categorias, aperfeiçoando as ferramentas do painel e investindo
na qualidade da experiência, para que a plataforma seja a primeira opção de quem
procura e de quem oferece serviços.
$md$
    ),
    (
        'termos-de-uso',
        'Termos de uso',
        'As regras para utilização da plataforma e as responsabilidades de cada parte.',
        $md$# Termos de uso

Estes termos regulam o uso da plataforma. Ao acessá-la ou utilizá-la, você concorda
com as condições descritas abaixo. Recomendamos a leitura atenta deste documento.

## 1. Aceitação dos termos

O uso da plataforma implica a aceitação integral destes termos. Caso você não
concorde com qualquer disposição, não utilize os serviços oferecidos.

## 2. Cadastro e conta

Para utilizar determinados recursos é necessário criar uma conta, fornecendo
informações verdadeiras, completas e atualizadas. Você é responsável por manter a
confidencialidade de suas credenciais e por todas as atividades realizadas em sua
conta.

## 3. Uso da plataforma

A plataforma deve ser utilizada de forma lícita e de acordo com estes termos. É
vedado publicar conteúdo falso, enganoso, ofensivo ou que viole direitos de
terceiros, bem como tentar comprometer a segurança ou o funcionamento do serviço.

## 4. Responsabilidades

A plataforma atua como um espaço de conexão entre usuários e anunciantes. A
negociação, a contratação e a execução dos serviços ocorrem diretamente entre as
partes, que são as únicas responsáveis por seus atos, informações e compromissos
assumidos.

## 5. Propriedade intelectual

Marca, identidade visual, textos, layout e software da plataforma são protegidos e
não podem ser copiados, reproduzidos ou utilizados sem autorização prévia. O
conteúdo publicado por cada usuário permanece de sua responsabilidade.

## 6. Alterações nos termos

Estes termos podem ser atualizados a qualquer momento para refletir mudanças no
serviço ou na legislação aplicável. A versão vigente estará sempre disponível nesta
página, e o uso continuado da plataforma após alterações representa concordância com
o novo texto.

## 7. Contato

Em caso de dúvidas sobre estes termos, entre em contato pelos canais de atendimento
divulgados na plataforma.
$md$
    )
) AS v(slug, title, description, content)
JOIN LATERAL (
    SELECT uid FROM auth.users WHERE is_root = true ORDER BY created_at ASC LIMIT 1
) AS u(uid) ON true
JOIN LATERAL (
    SELECT tn.uid FROM auth.tenants tn WHERE tn.owner_uid = u.uid ORDER BY tn.created_at ASC LIMIT 1
) AS t(uid) ON true
ON CONFLICT ON CONSTRAINT pages_tenant_slug_unique DO NOTHING;

NOTIFY pgrst, 'reload schema';
