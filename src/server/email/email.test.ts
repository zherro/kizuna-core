import { describe, expect, it, vi, beforeEach } from 'vitest';

const sendMail = vi.fn();
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import { sendEmail } from './index';

describe('sendEmail', () => {
  beforeEach(() => {
    sendMail.mockReset();
    for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) delete process.env[k];
  });

  it('lança sem SMTP config', async () => {
    await expect(
      sendEmail({ to: 'a@b.com', template: { subject: 's', text: 't', html: '<p>h</p>' } })
    ).rejects.toThrow(/SMTP/);
  });

  it('chama sendMail com o template', async () => {
    process.env.SMTP_HOST = 'h';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASS = 'p';
    sendMail.mockResolvedValue({ messageId: 'm1' });
    await sendEmail({ to: 'a@b.com', template: { subject: 's', text: 't', html: '<p>h</p>' } });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com', subject: 's', text: 't', html: '<p>h</p>' })
    );
  });
});
