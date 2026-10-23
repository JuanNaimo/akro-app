import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { describeError } from '../common/describe-error.js';
import type { Env } from '../config/env.js';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Mails transaccionales por SMTP (Mailpit en desarrollo). Sin SMTP_URL no se envían: se
// loguean, así el API corre sin configurar nada.
@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly transporter?: Transporter;

  constructor(config: ConfigService<Env, true>) {
    this.from = config.get('MAIL_FROM', { infer: true });
    const smtpUrl = config.get('SMTP_URL', { infer: true });
    if (smtpUrl) this.transporter = createTransport(smtpUrl);
  }

  // Nunca falla: los errores van al log. Quien manda un mail no espera el envío, así un SMTP
  // caído no rompe el pedido y la respuesta tarda lo mismo haya mail o no (no delata qué
  // cuentas existen). Cuando estén los jobs, esto pasa a una cola con reintentos.
  async send(mail: Mail): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `Sin SMTP, el mail no se envía. Para ${mail.to}: ${mail.subject}\n${mail.text}`,
      );
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, ...mail });
    } catch (err) {
      this.logger.error(
        `No se pudo mandar «${mail.subject}» a ${mail.to}: ${describeError(err)}`,
      );
    }
  }

  onModuleDestroy() {
    this.transporter?.close();
  }
}
