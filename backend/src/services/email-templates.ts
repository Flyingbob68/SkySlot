/**
 * Email template functions for every notification type.
 *
 * Each function returns `{ subject, html, text }` so the email service
 * can send both HTML and plain-text fallback.  All copy is in Italian.
 *
 * Templates use a shared layout wrapper for consistent branding.
 */

// ---------------------------------------------------------------------------
// Template data types
// ---------------------------------------------------------------------------

export interface BookingCreatedData {
  readonly pilotName: string;
  readonly aircraftCallsign: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly slotType: string;
  readonly instructorName?: string;
}

export interface BookingModifiedData {
  readonly pilotName: string;
  readonly aircraftCallsign: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly slotType: string;
  readonly instructorName?: string;
}

export interface BookingCancelledData {
  readonly pilotName: string;
  readonly aircraftCallsign: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly slotType: string;
  readonly instructorName?: string;
}

export interface BookingMovedData {
  readonly pilotName: string;
  readonly oldAircraft: string;
  readonly newAircraft: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface WelcomeData {
  readonly memberName: string;
  readonly email: string;
  readonly temporaryPassword?: string;
}

export interface PasswordResetData {
  readonly memberName: string;
  readonly resetLink: string;
}

export interface EmailVerificationData {
  readonly memberName: string;
  readonly verificationLink: string;
}

export interface QualificationExpiringData {
  readonly memberName: string;
  readonly qualificationName: string;
  readonly expiryDate: string;
}

export interface SubscriptionExpiringData {
  readonly memberName: string;
  readonly expiryDate: string;
}

// ---------------------------------------------------------------------------
// Template result
// ---------------------------------------------------------------------------

export interface EmailTemplate {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

// ---------------------------------------------------------------------------
// Shared layout
// ---------------------------------------------------------------------------

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; color: #18181b; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; margin-top: 16px; border: 1px solid #e4e4e7; }
    .header { text-align: center; padding-bottom: 16px; border-bottom: 2px solid #3b82f6; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 20px; color: #3b82f6; }
    .content p { margin: 0 0 12px; line-height: 1.6; font-size: 15px; }
    .detail { background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .detail-label { font-weight: 600; color: #52525b; }
    .btn { display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header"><h1>SkySlot</h1></div>
      <div class="content">${body}</div>
    </div>
    <div class="footer">
      <p>Questa email e' stata inviata automaticamente da SkySlot.</p>
      <p>Non rispondere a questa email.</p>
    </div>
  </div>
</body>
</html>`;
}

function slotTypeLabel(slotType: string): string {
  const labels: Record<string, string> = {
    SOLO: 'Volo solo',
    DUAL: 'Doppio comando',
    MAINTENANCE: 'Manutenzione',
  };
  return labels[slotType] ?? slotType;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function bookingCreatedTemplate(
  data: BookingCreatedData,
): EmailTemplate {
  const instructorRow = data.instructorName
    ? `<div class="detail-row"><span class="detail-label">Istruttore:</span><span>${data.instructorName}</span></div>`
    : '';

  const instructorText = data.instructorName
    ? `\nIstruttore: ${data.instructorName}`
    : '';

  const body = `
    <p>Ciao <strong>${data.pilotName}</strong>,</p>
    <p>La tua prenotazione e' stata creata con successo.</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Aeromobile:</span><span>${data.aircraftCallsign}</span></div>
      <div class="detail-row"><span class="detail-label">Tipo:</span><span>${slotTypeLabel(data.slotType)}</span></div>
      <div class="detail-row"><span class="detail-label">Inizio:</span><span>${data.startDate}</span></div>
      <div class="detail-row"><span class="detail-label">Fine:</span><span>${data.endDate}</span></div>
      ${instructorRow}
    </div>
    <p>Buon volo!</p>`;

  return {
    subject: `Prenotazione confermata - ${data.aircraftCallsign}`,
    html: wrapHtml('Prenotazione confermata', body),
    text: `Ciao ${data.pilotName},\n\nLa tua prenotazione e' stata creata con successo.\n\nAeromobile: ${data.aircraftCallsign}\nTipo: ${slotTypeLabel(data.slotType)}\nInizio: ${data.startDate}\nFine: ${data.endDate}${instructorText}\n\nBuon volo!\n\n-- SkySlot`,
  };
}

export function bookingModifiedTemplate(
  data: BookingModifiedData,
): EmailTemplate {
  const instructorRow = data.instructorName
    ? `<div class="detail-row"><span class="detail-label">Istruttore:</span><span>${data.instructorName}</span></div>`
    : '';

  const instructorText = data.instructorName
    ? `\nIstruttore: ${data.instructorName}`
    : '';

  const body = `
    <p>Ciao <strong>${data.pilotName}</strong>,</p>
    <p>La tua prenotazione e' stata modificata. Ecco i dettagli aggiornati:</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Aeromobile:</span><span>${data.aircraftCallsign}</span></div>
      <div class="detail-row"><span class="detail-label">Tipo:</span><span>${slotTypeLabel(data.slotType)}</span></div>
      <div class="detail-row"><span class="detail-label">Inizio:</span><span>${data.startDate}</span></div>
      <div class="detail-row"><span class="detail-label">Fine:</span><span>${data.endDate}</span></div>
      ${instructorRow}
    </div>`;

  return {
    subject: `Prenotazione modificata - ${data.aircraftCallsign}`,
    html: wrapHtml('Prenotazione modificata', body),
    text: `Ciao ${data.pilotName},\n\nLa tua prenotazione e' stata modificata.\n\nAeromobile: ${data.aircraftCallsign}\nTipo: ${slotTypeLabel(data.slotType)}\nInizio: ${data.startDate}\nFine: ${data.endDate}${instructorText}\n\n-- SkySlot`,
  };
}

export function bookingCancelledTemplate(
  data: BookingCancelledData,
): EmailTemplate {
  const instructorRow = data.instructorName
    ? `<div class="detail-row"><span class="detail-label">Istruttore:</span><span>${data.instructorName}</span></div>`
    : '';

  const instructorText = data.instructorName
    ? `\nIstruttore: ${data.instructorName}`
    : '';

  const body = `
    <p>Ciao <strong>${data.pilotName}</strong>,</p>
    <p>La seguente prenotazione e' stata cancellata:</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Aeromobile:</span><span>${data.aircraftCallsign}</span></div>
      <div class="detail-row"><span class="detail-label">Tipo:</span><span>${slotTypeLabel(data.slotType)}</span></div>
      <div class="detail-row"><span class="detail-label">Inizio:</span><span>${data.startDate}</span></div>
      <div class="detail-row"><span class="detail-label">Fine:</span><span>${data.endDate}</span></div>
      ${instructorRow}
    </div>`;

  return {
    subject: `Prenotazione cancellata - ${data.aircraftCallsign}`,
    html: wrapHtml('Prenotazione cancellata', body),
    text: `Ciao ${data.pilotName},\n\nLa seguente prenotazione e' stata cancellata.\n\nAeromobile: ${data.aircraftCallsign}\nTipo: ${slotTypeLabel(data.slotType)}\nInizio: ${data.startDate}\nFine: ${data.endDate}${instructorText}\n\n-- SkySlot`,
  };
}

export function bookingMovedTemplate(data: BookingMovedData): EmailTemplate {
  const body = `
    <p>Ciao <strong>${data.pilotName}</strong>,</p>
    <p>La tua prenotazione e' stata spostata su un altro aeromobile:</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Aeromobile precedente:</span><span>${data.oldAircraft}</span></div>
      <div class="detail-row"><span class="detail-label">Nuovo aeromobile:</span><span>${data.newAircraft}</span></div>
      <div class="detail-row"><span class="detail-label">Inizio:</span><span>${data.startDate}</span></div>
      <div class="detail-row"><span class="detail-label">Fine:</span><span>${data.endDate}</span></div>
    </div>
    <p>L'orario della prenotazione rimane invariato.</p>`;

  return {
    subject: `Prenotazione spostata - da ${data.oldAircraft} a ${data.newAircraft}`,
    html: wrapHtml('Prenotazione spostata', body),
    text: `Ciao ${data.pilotName},\n\nLa tua prenotazione e' stata spostata su un altro aeromobile.\n\nAeromobile precedente: ${data.oldAircraft}\nNuovo aeromobile: ${data.newAircraft}\nInizio: ${data.startDate}\nFine: ${data.endDate}\n\nL'orario della prenotazione rimane invariato.\n\n-- SkySlot`,
  };
}

export function welcomeTemplate(data: WelcomeData): EmailTemplate {
  const passwordRow = data.temporaryPassword
    ? `<div class="detail-row"><span class="detail-label">Password temporanea:</span><span>${data.temporaryPassword}</span></div>`
    : '';

  const passwordText = data.temporaryPassword
    ? `\nPassword temporanea: ${data.temporaryPassword}`
    : '';

  const body = `
    <p>Ciao <strong>${data.memberName}</strong>,</p>
    <p>Benvenuto in SkySlot! Il tuo account e' stato creato con successo.</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Email:</span><span>${data.email}</span></div>
      ${passwordRow}
    </div>
    <p>Accedi alla piattaforma per gestire le tue prenotazioni e consultare il calendario voli.</p>`;

  return {
    subject: 'Benvenuto in SkySlot',
    html: wrapHtml('Benvenuto in SkySlot', body),
    text: `Ciao ${data.memberName},\n\nBenvenuto in SkySlot! Il tuo account e' stato creato con successo.\n\nEmail: ${data.email}${passwordText}\n\nAccedi alla piattaforma per gestire le tue prenotazioni.\n\n-- SkySlot`,
  };
}

export function passwordResetTemplate(data: PasswordResetData): EmailTemplate {
  const body = `
    <p>Ciao <strong>${data.memberName}</strong>,</p>
    <p>Hai richiesto il reset della password. Clicca il pulsante qui sotto per impostare una nuova password:</p>
    <p style="text-align: center;">
      <a href="${data.resetLink}" class="btn">Reimposta password</a>
    </p>
    <p>Se non hai richiesto il reset della password, ignora questa email. Il link scadra' automaticamente.</p>
    <p style="font-size: 13px; color: #71717a;">Link diretto: ${data.resetLink}</p>`;

  return {
    subject: 'Reset password - SkySlot',
    html: wrapHtml('Reset password', body),
    text: `Ciao ${data.memberName},\n\nHai richiesto il reset della password.\n\nClicca il seguente link per impostare una nuova password:\n${data.resetLink}\n\nSe non hai richiesto il reset, ignora questa email.\n\n-- SkySlot`,
  };
}

export function emailVerificationTemplate(
  data: EmailVerificationData,
): EmailTemplate {
  const body = `
    <p>Ciao <strong>${data.memberName}</strong>,</p>
    <p>Per completare la registrazione, verifica il tuo indirizzo email cliccando il pulsante qui sotto:</p>
    <p style="text-align: center;">
      <a href="${data.verificationLink}" class="btn">Verifica email</a>
    </p>
    <p style="font-size: 13px; color: #71717a;">Link diretto: ${data.verificationLink}</p>`;

  return {
    subject: 'Verifica email - SkySlot',
    html: wrapHtml('Verifica email', body),
    text: `Ciao ${data.memberName},\n\nPer completare la registrazione, verifica il tuo indirizzo email:\n${data.verificationLink}\n\n-- SkySlot`,
  };
}

export function qualificationExpiringTemplate(
  data: QualificationExpiringData,
): EmailTemplate {
  const body = `
    <p>Ciao <strong>${data.memberName}</strong>,</p>
    <p>Ti informiamo che la seguente qualifica e' in scadenza:</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Qualifica:</span><span>${data.qualificationName}</span></div>
      <div class="detail-row"><span class="detail-label">Scadenza:</span><span>${data.expiryDate}</span></div>
    </div>
    <p>Provvedi al rinnovo per continuare a volare senza restrizioni.</p>`;

  return {
    subject: `Qualifica in scadenza - ${data.qualificationName}`,
    html: wrapHtml('Qualifica in scadenza', body),
    text: `Ciao ${data.memberName},\n\nLa seguente qualifica e' in scadenza:\n\nQualifica: ${data.qualificationName}\nScadenza: ${data.expiryDate}\n\nProvvedi al rinnovo per continuare a volare.\n\n-- SkySlot`,
  };
}

export function subscriptionExpiringTemplate(
  data: SubscriptionExpiringData,
): EmailTemplate {
  const body = `
    <p>Ciao <strong>${data.memberName}</strong>,</p>
    <p>Ti informiamo che la tua quota associativa e' in scadenza:</p>
    <div class="detail">
      <div class="detail-row"><span class="detail-label">Scadenza:</span><span>${data.expiryDate}</span></div>
    </div>
    <p>Provvedi al rinnovo per continuare ad utilizzare i servizi dell'aeroclub.</p>`;

  return {
    subject: 'Quota associativa in scadenza - SkySlot',
    html: wrapHtml('Quota in scadenza', body),
    text: `Ciao ${data.memberName},\n\nLa tua quota associativa e' in scadenza il ${data.expiryDate}.\n\nProvvedi al rinnovo per continuare ad utilizzare i servizi dell'aeroclub.\n\n-- SkySlot`,
  };
}
