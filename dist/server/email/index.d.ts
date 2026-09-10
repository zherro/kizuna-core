export type EmailTemplate = {
    subject: string;
    text: string;
    html: string;
};
type SendEmailInput = {
    to: string;
    template: EmailTemplate;
};
export declare function sendEmail(input: SendEmailInput): Promise<any>;
export {};
//# sourceMappingURL=index.d.ts.map