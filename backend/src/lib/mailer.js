const nodemailer = require('nodemailer');

// Lazily built so a missing SMTP config doesn't crash the whole process at
// boot — it just means sendMail() no-ops (logged) until it's configured.
let transporter;
let attempted = false;

function getTransporter() {
  if (attempted) return transporter;
  attempted = true;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

// `to` may be a single address or an array — sent as BCC so recipients don't
// see each other's addresses on an internal-wide notification.
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    const count = Array.isArray(to) ? to.length : 1;
    console.warn(`[mailer] SMTP_HOST no configurado — se omitió el correo "${subject}" para ${count} destinatario(s). Ver backend/.env.example.`);
    return { skipped: true };
  }
  return t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, bcc: to, subject, text, html });
}

module.exports = { sendMail };
