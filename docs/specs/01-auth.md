# 01 - Autenticazione e Autorizzazione

## 1.1 Autenticazione

### Login con Email + Password

- L'utente si autentica con email e password
- Password hashata con **bcrypt** (salt rounds >= 12)
- Al login vengono emessi:
  - **Access token** JWT (scadenza: 15 minuti)
  - **Refresh token** JWT (scadenza: 7 giorni, stored in httpOnly cookie)
- Il refresh token permette di ottenere un nuovo access token senza re-login

### Login con OAuth (Google)

- Flusso OAuth 2.0 Authorization Code con Google
- Se l'email Google corrisponde a un socio esistente, login automatico
- Se l'email non esiste, viene creato un account (se consentito dalla configurazione del club)
- L'account OAuth puo' anche impostare una password locale

### Registrazione

- La registrazione puo' essere:
  - **Aperta**: chiunque puo' registrarsi (soggetto ad approvazione admin)
  - **Solo invito**: l'admin crea l'account e invia credenziali
  - **Disabilitata**: nessuna auto-registrazione
- Campi obbligatori: nome, cognome, email, password
- Campi opzionali: telefono, indirizzo, codice fiscale
- Email di conferma con link di verifica

### Reset Password

- Richiesta reset via email
- Token monouso con scadenza (1 ora)
- Obbligo di nuova password al primo login (per account creati da admin)

### Protezione Brute-Force

- Dopo 5 tentativi falliti: blocco di 5 minuti per IP
- Dopo 10 tentativi falliti: blocco di 30 minuti per login
- Escalation progressiva dei tempi di blocco
- Log di tutti i tentativi di accesso

## 1.2 Autorizzazione (RBAC)

### Ruoli Predefiniti

| Ruolo | Descrizione |
|-------|-------------|
| `admin` | Accesso completo a tutte le funzionalita' |
| `manager` | Gestione soci, aeromobili, report (no config sistema) |
| `instructor` | Come pilot + gestione propria disponibilita' |
| `pilot` | Prenotazione voli, gestione profilo |
| `student` | Come pilot ma solo voli con istruttore |
| `visitor` | Solo consultazione calendario (no prenotazioni) |

### Permessi Granulari

| Permesso | Descrizione |
|----------|-------------|
| `booking:create_solo` | Prenotare voli senza istruttore |
| `booking:create_dual` | Prenotare voli con istruttore |
| `booking:create_any` | Prenotare per conto di altri soci |
| `booking:override_date_limit` | Superare il limite di prenotazione anticipata |
| `booking:override_duration` | Superare il limite di durata massima |
| `booking:override_instructor` | Prenotare anche su slot istruttore non disponibile |
| `aircraft:manage` | CRUD aeromobili |
| `aircraft:freeze` | Mettere aeromobile in manutenzione |
| `member:manage` | CRUD soci |
| `member:edit_own` | Modificare il proprio profilo |
| `qualification:manage` | Gestire qualifiche di tutti |
| `qualification:edit_own` | Gestire le proprie qualifiche |
| `instructor:manage_availability` | Gestire disponibilita' istruttori |
| `club:configure` | Configurazione parametri club |
| `club:export` | Esportazione dati (CSV, Excel) |
| `audit:view` | Visualizzare log di audit |

### Assegnazione Permessi

- Ogni ruolo ha un set predefinito di permessi
- I permessi possono essere personalizzati per ruolo dall'admin
- Un utente puo' avere piu' ruoli (i permessi si sommano)
- I permessi vengono inclusi nel JWT come claims

## 1.3 Sessioni

- Access token: stateless, validato su ogni richiesta
- Refresh token: memorizzato nel database per possibilita' di revoca
- Logout: invalidazione del refresh token
- Possibilita' di "logout da tutti i dispositivi" (invalidazione di tutti i refresh tokens)
- Timeout di inattivita' configurabile (default: 30 minuti)

## 1.4 API Endpoints

```
POST   /api/auth/register       # Registrazione
POST   /api/auth/login          # Login email+password
POST   /api/auth/refresh        # Rinnovo access token
POST   /api/auth/logout         # Logout
POST   /api/auth/forgot-password # Richiesta reset password
POST   /api/auth/reset-password  # Reset password con token
GET    /api/auth/google          # Inizio flusso OAuth Google
GET    /api/auth/google/callback # Callback OAuth Google
GET    /api/auth/me              # Profilo utente corrente
```
