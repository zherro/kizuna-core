---
description: Como o app nomeia o item que o usuário cria (Publicação, Serviço, Anúncio) — presets, termos com gênero e frases.
---

# Vocabulário do projeto

Como o app chama o **item** que o usuário cria e gerencia: "Publicação", "Serviço", "Anúncio"…
É só texto — rotas (`/painel/meus-servicos`), tabelas (`services`) e nomes de código não mudam.

## Configuração (`kizuna.config.json`)

```json
"vocabulary": {
  "context": "publicacao",
  "terms": { "item": { "singular": "Anúncio", "plural": "Anúncios", "gender": "m" } },
  "phrases": { "new": "Anunciar" }
}
```

| Chave | O que faz |
| --- | --- |
| `context` | Preset. `publicacao` (**padrão**, feminino) ou `servico` (masculino, vocabulário anterior). |
| `terms.item` | Troca o termo. `singular`, `plural` e `gender` (`"m"` \| `"f"`). Ao trocar o termo o `gender` é **obrigatório**: Novo/Nova, Nenhum/Nenhuma dependem dele. |
| `phrases` | Sobrescreve uma frase pronta (tabela abaixo). Vence a frase derivada. |

Sem o bloco `vocabulary` vale `publicacao`. Config inválida (contexto, gênero, termo ou frase
desconhecidos) quebra o boot com erro claro.

## Frases

| Chave | `publicacao` | `servico` |
| --- | --- | --- |
| `singular` / `plural` | Publicação / Publicações | Serviço / Serviços |
| `new` | Nova publicação | Novo serviço |
| `manage` | Gerenciar publicações | Gerenciar serviços |
| `manageDescription` | Crie publicações em etapas e continue a edição quando precisar. | Crie serviços em etapas… |
| `yours` | Suas publicações | Seus serviços |
| `mine` | Minhas publicações | Meus serviços |
| `createFirst` | Criar primeira publicação | Criar primeiro serviço |
| `noneRegistered` | Nenhuma publicação cadastrada ainda. | Nenhum serviço cadastrado ainda. |
| `registerFirstHint` | Cadastre sua primeira publicação para começar. | Cadastre seu primeiro serviço… |
| `noneFound` | Nenhuma publicação encontrada | Nenhum serviço encontrado |
| `reviewTitle` / `reviewDescription` | Revisão de publicações / Acompanhe as publicações… | Revisão de serviços / … |

## Como usar no código

- **Telas do screen-engine** (dado puro): referencie a frase por string, `title: '$vocab.manage'`.
  O `resolveContextRefs` (`screen-engine/context.ts`) resolve no servidor, com ou sem `context`.
- **Componentes React do projeto**: `import { vocabulary } from '@/lib/vocabulary'` e use
  `vocabulary.phrases.new`.
- **No projeto**, `src/lib/vocabulary.ts` lê o JSON, valida (`parseVocabularyConfig`) e registra
  (`setVocabulary`); `app/painel/layout.tsx` o importa para registrar no servidor.
- **Frase nova**: adicione a chave em `PHRASE_KEYS` e em `derivePhrases`
  (`src/shared/vocabulary/index.ts`) com o teste correspondente; frases com gênero usam `FORMS`.

## Escopo atual

Menu do painel (starter), telas **Meus serviços** e **Aprovações**. O wizard já usa rótulos neutros
(`Novo`/`Editar`/`Revisão`). Busca, página pública, avaliações e mensagens ainda dizem "serviço".
