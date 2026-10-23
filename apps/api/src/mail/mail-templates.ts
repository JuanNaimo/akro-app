import type { Mail } from './mail.service.js';

type Template = Omit<Mail, 'to'>;

export function verifyEmailMail(link: string, hours: number): Template {
  return {
    subject: 'Confirmá tu mail en Akro',
    text: [
      '¡Hola! Para confirmar tu mail en Akro, abrí este link:',
      link,
      `Vence en ${hours} horas. Si no creaste una cuenta en Akro, ignorá este mail.`,
    ].join('\n\n'),
    html: layout([
      '<p>¡Hola! Para confirmar tu mail en Akro, tocá el botón:</p>',
      button(link, 'Confirmar mail'),
      `<p>Vence en ${hours} horas. Si no creaste una cuenta en Akro, ignorá este mail.</p>`,
    ]),
  };
}

export function resetPasswordMail(link: string, hours: number): Template {
  const expiry = hours === 1 ? '1 hora' : `${hours} horas`;
  return {
    subject: 'Restablecé tu contraseña de Akro',
    text: [
      'Pediste restablecer tu contraseña de Akro. Para elegir una nueva, abrí este link:',
      link,
      `Vence en ${expiry}. Si no lo pediste, ignorá este mail: tu contraseña sigue igual.`,
    ].join('\n\n'),
    html: layout([
      '<p>Pediste restablecer tu contraseña de Akro. Para elegir una nueva, tocá el botón:</p>',
      button(link, 'Elegir contraseña'),
      `<p>Vence en ${expiry}. Si no lo pediste, ignorá este mail: tu contraseña sigue igual.</p>`,
    ]),
  };
}

function layout(paragraphs: string[]): string {
  return `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #171717; max-width: 480px">${paragraphs.join('')}</div>`;
}

function button(link: string, label: string): string {
  const href = escapeHtml(link);
  return `<p><a href="${href}" style="display: inline-block; padding: 12px 20px; background: #171717; color: #ffffff; text-decoration: none; border-radius: 8px">${label}</a></p><p style="font-size: 13px; color: #525252">Si el botón no anda, copiá este link: ${href}</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
