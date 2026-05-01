import { Resend } from "resend";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface EmailSenderConfig {
  apiKey: string;
  from: string;
  devMode: boolean;
  logger?: (message: string) => void;
}

export type EmailSender = (msg: EmailMessage) => Promise<void>;

export function createEmailSender(config: EmailSenderConfig): EmailSender {
  if (config.devMode) {
    const log = config.logger ?? console.log;
    return async (msg) => {
      log(`\n--- DEV EMAIL ---\nTo: ${msg.to}\nSubject: ${msg.subject}\n${msg.html}\n--- END ---`);
    };
  }
  const resend = new Resend(config.apiKey);
  return async (msg) => {
    const { error } = await resend.emails.send({
      from: config.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    });
    if (error) throw new Error(`Resend failed: ${error.message}`);
  };
}
