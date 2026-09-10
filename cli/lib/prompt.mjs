// Prompt interativo com modos não-interativos:
//   yes     → confirm() = true, choose() = options[0]
//   noInput → lança (nenhuma pergunta pode ser respondida)
// Caso contrário usa node:readline/promises.

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export function makePrompt({ yes = false, noInput = false } = {}) {
  return {
    async confirm(msg) {
      if (yes) return true;
      if (noInput) throw new Error('precisaria de input interativo: ' + msg);
      const rl = createInterface({ input: stdin, output: stdout });
      try {
        const answer = (await rl.question(`${msg} [s/N] `)).trim().toLowerCase();
        return answer === 's' || answer === 'sim' || answer === 'y' || answer === 'yes';
      } finally {
        rl.close();
      }
    },
    async choose(msg, options) {
      if (yes) return options[0];
      if (noInput) throw new Error('precisaria de input interativo: ' + msg);
      const rl = createInterface({ input: stdin, output: stdout });
      try {
        stdout.write(msg + '\n');
        options.forEach((o, i) => stdout.write(`  ${i + 1}) ${o}\n`));
        const answer = (await rl.question('escolha: ')).trim();
        const idx = Number.parseInt(answer, 10) - 1;
        return options[idx] ?? options[0];
      } finally {
        rl.close();
      }
    },
  };
}
