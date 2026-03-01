# SkySlot - Specifica di Progetto

## Panoramica

SkySlot e' un sistema web per la gestione di aeroclub. Consente la prenotazione degli aeromobili, la gestione dei soci, il monitoraggio delle qualifiche e licenze, la pianificazione degli istruttori e l'amministrazione del club.

Il progetto nasce come riscrittura moderna dell'applicazione open source **OpenFlyers** (PHP/MySQL), reimplementata con stack Node.js + React + PostgreSQL.

## Obiettivi

1. **Prenotazione aeromobili** - Sistema di booking con griglia visuale, gestione conflitti e allocazione automatica
2. **Gestione soci** - Anagrafica, profili, qualifiche, quote associative
3. **Gestione istruttori** - Disponibilita' settimanale, eccezioni, assegnazione voli
4. **Qualifiche e licenze** - Tracciamento scadenze, requisiti per aeromobile, alert automatici
5. **Amministrazione club** - Configurazione, esportazioni, audit log
6. **Notifiche** - Email automatiche per prenotazioni e scadenze

## Moduli

| # | Modulo | Specifica |
|---|--------|-----------|
| 1 | [Autenticazione e Autorizzazione](./01-auth.md) | Login, registrazione, ruoli, permessi |
| 2 | [Gestione Soci](./02-members.md) | Anagrafica, profili, preferenze |
| 3 | [Gestione Aeromobili](./03-aircraft.md) | Flotta, tipi, manutenzione |
| 4 | [Sistema di Prenotazione](./04-bookings.md) | Booking, conflitti, allocatore |
| 5 | [Qualifiche e Licenze](./05-qualifications.md) | Certificazioni, scadenze, requisiti |
| 6 | [Gestione Istruttori](./06-instructors.md) | Disponibilita', calendario |
| 7 | [Amministrazione Club](./07-admin.md) | Configurazione, esportazioni, audit |
| 8 | [Notifiche](./08-notifications.md) | Email, alert scadenze |
| 9 | [Schema Database](./09-database.md) | Modello dati completo |

## Utenti Target

- **Pilota (Socio)** - Consulta disponibilita', prenota voli, gestisce profilo
- **Istruttore** - Come pilota + gestisce propria disponibilita'
- **Segreteria** - Gestisce soci, quote, esportazioni
- **Amministratore** - Configurazione completa del sistema
- **Visitatore** - Consultazione pubblica del calendario (opzionale)

## Vincoli Tecnici

- Sviluppo su Windows, deploy su Linux (senza Docker)
- Backend: Node.js + Express + TypeScript
- Frontend: React + Vite + TypeScript
- Database: PostgreSQL con Prisma ORM
- Autenticazione: JWT + OAuth (Google)
- Deploy: PM2 + nginx + systemd
- Granularita' temporale: 15 minuti (quarter-hour)
- Tutti gli orari in UTC, visualizzazione nel timezone dell'utente
