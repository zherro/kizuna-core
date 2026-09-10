import nodemailer from 'nodemailer';
function getMailerConfig() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'no-reply@localhost';
    if (!host || !user || !pass) {
        return null;
    }
    return {
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        from,
    };
}
export async function sendEmail(input) {
    const config = getMailerConfig();
    if (!config) {
        throw new Error('SMTP nao configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS.');
    }
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
    });
    try {
        const info = await transporter.sendMail({
            from: config.from,
            to: input.to,
            subject: input.template.subject,
            text: input.template.text,
            html: input.template.html,
        });
        return info;
    }
    catch (error) {
        console.error('❌ [EMAIL] Erro ao enviar:', {
            to: input.to,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
//# sourceMappingURL=index.js.map