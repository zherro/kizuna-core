export type OtpPurpose = 'login' | 'verify_phone';

/**
 * Dados entregues à porta. O TEXTO da mensagem não existe aqui: ele mora no gateway do provedor
 * (template aprovado na Meta, template da Zenvia/Twilio etc.) — o adaptador só repassa isto.
 */
export type OtpPayload = {
  /** E.164, ex.: +5565999998888 */
  phone: string;
  code: string;
  expiresInSec: number;
  purpose: OtpPurpose;
  locale: string;
  requestId: string;
};

export type OtpSendResult = { ok: boolean; provider: string; messageId?: string; error?: string };

/**
 * Porta de envio de código. Provedor real (WhatsApp Cloud API, Zenvia, Twilio...) = novo arquivo
 * que implementa isto + `registerOtpProvider()` + nome em `otp.providers` do kizuna.config.json.
 */
export interface OtpProvider {
  /** Nome usado em `otp.providers`. */
  name: string;
  /** true só para adaptadores de desenvolvimento — em produção eles não habilitam o login. */
  devOnly?: boolean;
  send(payload: OtpPayload): Promise<OtpSendResult>;
}

/** Bloco `otp` do kizuna.config.json. */
export type OtpConfig = {
  /** Ordem = cadeia de fallback. Ex.: ["meta-whatsapp", "zenvia-sms"]. */
  providers?: string[];
  codeLength?: number;
  ttlSec?: number;
  cooldownSec?: number;
  dailyLimit?: number;
  maxAttempts?: number;
  locale?: string;
};
