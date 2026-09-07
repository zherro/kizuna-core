#!/usr/bin/env node
// Dispatcher do CLI kizuna. Faz o parse de argv, resolve caminhos, monta o
// contexto e roteia para commands/<cmd>.mjs (cada um exporta async run(ctx) -> number).

import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { resolvePaths } from './lib/paths.mjs';
import { makePrompt } from './lib/prompt.mjs';

const COMMANDS = ['install', 'update', 'sync', 'check', 'lock', 'adopt', 'db', 'plugin'];

// Flags globais que consomem o próximo token como valor.
const VALUE_FLAGS = new Set(['--project', '--db-url', '--plugin', '--psql', '--reseed']);

function parseArgv(argv) {
  const flags = {};
  const args = [];
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok.startsWith('--')) {
      const key = tok.slice(2);
      if (VALUE_FLAGS.has(tok)) {
        flags[camel(key)] = argv[i + 1];
        i += 1;
      } else if (key.startsWith('no-')) {
        flags[camel(key.slice(3))] = false;
      } else {
        flags[camel(key)] = true;
      }
    } else {
      args.push(tok);
    }
  }
  return { flags, args };
}

function camel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

const USAGE = `kizuna — casca compartilhada do kizuna-core

uso: kizuna <comando> [opções]

comandos:
  install            materializa a casca e escreve kizuna.lock
  update             puxa o core e reaplica a casca
  sync               empurra edições locais de volta para o template/
  check              avisa se o core divergiu do lock (nunca falha)
  lock               marca o core atual como "visto" no kizuna.lock
  adopt              gera kizuna.lock de um projeto que já tem a casca
  db <install|migrate>   roda a instalação / migrations incrementais
  plugin <list|add <nome>>

opções globais:
  --project <dir>    raiz do projeto (padrão: cwd)
  --db-url <url>     conexão do PostgreSQL (ou env DATABASE_URL)
  --psql "<cmd>"     comando psql (ou env KIZUNA_PSQL); ex.: "docker exec -i pg psql -U myuser"
  --yes              responde "sim" a toda confirmação
  --no-input         falha em vez de perguntar
  --force            (install) re-materializa TODA a casca por cima do projeto
  --reseed <paths>   (update) re-copia seeds do template ("all" ou "a,b,c")
  --help             esta ajuda
`;

export default async function main(argv) {
  const { flags, args } = parseArgv(argv);
  const cmd = args[0];

  if (flags.help || !cmd) {
    console.log(USAGE);
    return 0;
  }
  if (!COMMANDS.includes(cmd)) {
    console.error(`comando desconhecido: ${cmd}\n\n${USAGE}`);
    return 1;
  }

  const paths = resolvePaths({ projectDirOverride: flags.project });
  const prompt = makePrompt({ yes: flags.yes === true, noInput: flags.input === false });
  const ctx = { paths, args: args.slice(1), prompt, flags };

  const mod = await import(`./commands/${cmd}.mjs`);
  return mod.run(ctx);
}

// Executado diretamente? Cobre `node cli/index.mjs` e `node cli` (Node resolve o
// diretório para este arquivo via cli/package.json "main").
const HERE = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
if (invoked === HERE || invoked === dirname(HERE)) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      // `check` é o hook do predev: NUNCA pode falhar o `npm run dev`.
      if (process.argv[2] === 'check') {
        console.log(`aviso: kizuna check falhou internamente (${err.message})`);
        process.exit(0);
      }
      console.error(err.message);
      process.exit(1);
    });
}
