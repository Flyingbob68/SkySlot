# 07 - Amministrazione Club

## 7.1 Configurazione Club

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| clubName | string | - | Nome del club |
| clubLogo | file | null | Logo (PNG/JPG, max 500KB) |
| clubWebsite | string | null | URL sito web esterno |
| icaoCode | string | - | Codice ICAO dell'aeroporto (per alba/tramonto) |
| firstHour | time | 07:00 | Prima ora visualizzata nel calendario |
| lastHour | time | 21:00 | Ultima ora visualizzata nel calendario |
| defaultTimezone | string | Europe/Rome | Timezone predefinito del club |
| defaultLanguage | string | it | Lingua predefinita |
| defaultSlotDuration | integer | 60 | Durata predefinita prenotazione (minuti) |
| minSlotDuration | integer | 30 | Durata minima prenotazione (minuti) |
| infoMessage | text | null | Messaggio informativo in homepage |
| mailFromAddress | string | - | Indirizzo mittente per email |

## 7.2 Parametri di Prenotazione

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| bookDateLimitWeeks | integer | 4 | Limite prenotazione anticipata (settimane) |
| bookDurationLimitHours | integer | 0 | Durata massima prenotazione (0 = illimitata) |
| bookInstructionMinMinutes | integer | 0 | Durata minima volo con istruttore (0 = nessun min) |
| bookAllocatingRule | enum | SPECIFIC | Regola allocatore (SPECIFIC / BY_TYPE) |
| bookCommentEnabled | boolean | false | Abilita campo commenti nelle prenotazioni |
| qualificationMode | enum | OFF | Controllo qualifiche (OFF / WARNING / RESTRICTED) |
| subscriptionMode | enum | OFF | Controllo quote (OFF / WARNING / RESTRICTED) |
| registrationMode | enum | INVITE | Modalita' registrazione (OPEN / INVITE / DISABLED) |

## 7.3 Gestione Ruoli e Permessi

- L'admin puo' creare nuovi ruoli oltre ai predefiniti
- Ogni ruolo ha un set di permessi associati
- I permessi possono essere aggiunti/rimossi per ruolo
- Gli utenti possono avere piu' ruoli

### Ruoli Predefiniti (Non Eliminabili)

- admin, manager, instructor, pilot, student, visitor

## 7.4 Database Management

### Backup

- Export SQL completo del database (download .sql)
- Export programmabile (cron job sul server)

### Export Soci

- CSV con separatore punto e virgola
- Excel (.xlsx)
- Campi: tutti i dati anagrafici (rispettando i permessi)

### Purge Cache

- Pulizia tabella cache alba/tramonto
- Pulizia sessioni scadute

## 7.5 Audit Log

Ogni azione significativa viene registrata:

| Campo | Tipo |
|-------|------|
| id | cuid |
| timestamp | datetime |
| userId | FK |
| action | string |
| entity | string |
| entityId | string |
| oldValues | JSON |
| newValues | JSON |
| ipAddress | string |

### Azioni Tracciate

| Entita' | Azioni |
|---------|--------|
| Booking | create, update, delete, auto_update |
| Member | create, update, deactivate, reactivate |
| Aircraft | create, update, freeze, unfreeze |
| Qualification | assign, update, remove |
| Club Config | update |
| Auth | login, logout, failed_login, password_reset |

### Visualizzazione

- Lista paginata con filtri (utente, entita', azione, data)
- Dettaglio con vecchi/nuovi valori
- Solo per utenti con permesso `audit:view`

## 7.6 Statistiche Base

- Numero soci attivi
- Numero prenotazioni nel mese corrente
- Ore di volo totali nel mese
- Aeromobili piu' utilizzati
- Qualifiche in scadenza

## 7.7 API Endpoints

```
GET    /api/admin/config             # Configurazione corrente
PUT    /api/admin/config             # Aggiorna configurazione
POST   /api/admin/config/logo       # Upload logo
GET    /api/admin/roles              # Lista ruoli
POST   /api/admin/roles              # Crea ruolo
PUT    /api/admin/roles/:id          # Modifica ruolo/permessi
DELETE /api/admin/roles/:id          # Elimina ruolo
GET    /api/admin/audit              # Log di audit (paginato, filtri)
GET    /api/admin/audit/:id          # Dettaglio audit entry
GET    /api/admin/stats              # Statistiche base
GET    /api/admin/export/database    # Backup database
```
