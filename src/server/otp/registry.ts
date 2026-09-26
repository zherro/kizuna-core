import type { OtpConfig, OtpPayload, OtpProvider, OtpSendResult } from './types';

/** Adaptador de desenvolvimento: só imprime o JSON que um provedor real receberia. */
export const logOtpProvider: OtpProvider = {
  name: 'log',
  devOnly: true,
  async send(payload: OtpPayload): Promise<OtpSendResult> {
    console.info('[auth.otp] log_provider', JSON.stringify(payload));
    return { ok: true, provider: 'log' };
  },
};

const REGISTRY = new Map<string, OtpProvider>([[logOtpProvider.name, logOtpProvider]]);

/** Registra um provedor real (chamar uma vez, ex.: no módulo da rota do projeto). */
export function registerOtpProvider(provider: OtpProvider): void {
  REGISTRY.set(provider.name, provider);
}

export const OTP_DEFAULTS = {
  codeLength: 6,
  ttlSec: 300,
  cooldownSec: 60,
  dailyLimit: 10,
  maxAttempts: 5,
  locale: 'pt-BR',
} as const;

export function resolveOtpConfig(config: OtpConfig | undefined) {
  const clamp = (v: number | undefined, def: number, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : def;
  return {
    providers: Array.isArray(config?.providers) ? config!.providers.filter(Boolean) : [],
    codeLength: clamp(config?.codeLength, OTP_DEFAULTS.codeLength, 4, 8),
    ttlSec: clamp(config?.ttlSec, OTP_DEFAULTS.ttlSec, 60, 1800),
    cooldownSec: clamp(config?.cooldownSec, OTP_DEFAULTS.cooldownSec, 0, 3600),
    dailyLimit: clamp(config?.dailyLimit, OTP_DEFAULTS.dailyLimit, 1, 1000),
    maxAttempts: clamp(config?.maxAttempts, OTP_DEFAULTS.maxAttempts, 1, 20),
    locale: config?.locale || OTP_DEFAULTS.locale,
  };
}

/**
 * Provedores utilizáveis, na ordem da config. Nomes desconhecidos são ignorados; adaptadores
 * `devOnly` ficam de fora em produção — então só `["log"]` em produção = telefone desligado.
 */
export function resolveOtpChain(
  config: OtpConfig | undefined,
  isProduction = process.env.NODE_ENV === 'production'
): OtpProvider[] {
  return resolveOtpConfig(config)
    .providers.map((name) => REGISTRY.get(name))
    .filter((p): p is OtpProvider => Boolean(p) && !(isProduction && p!.devOnly));
}

export function isPhoneLoginEnabled(config: OtpConfig | undefined): boolean {
  return resolveOtpChain(config).length > 0;
}

/** Tenta cada provedor em ordem até um aceitar (fallback). */
export async function sendOtp(chain: OtpProvider[], payload: OtpPayload): Promise<OtpSendResult> {
  let last: OtpSendResult = { ok: false, provider: 'none', error: 'no_provider' };
  for (const provider of chain) {
    try {
      const result = await provider.send(payload);
      if (result.ok) return result;
      last = result;
    } catch (error) {
      last = {
        ok: false,
        provider: provider.name,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    console.warn('[auth.otp] provider_failed', { provider: last.provider, error: last.error });
  }
  return last;
}
