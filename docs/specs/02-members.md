# 02 - Gestione Soci

## 2.1 Anagrafica Socio

### Campi

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:---:|------|
| id | cuid | auto | Chiave primaria |
| email | string | si | Univoco, usato per login |
| firstName | string | si | |
| lastName | string | si | |
| password | string | si | Hash bcrypt (non esposto in API) |
| fiscalCode | string | no | Codice fiscale |
| dateOfBirth | date | no | |
| address | string | no | |
| zipCode | string | no | |
| city | string | no | |
| state | string | no | Provincia |
| country | string | no | Default: "IT" |
| homePhone | string | no | |
| workPhone | string | no | |
| cellPhone | string | no | |
| memberNumber | string | no | Numero tessera aeroclub |
| subscriptionExpiry | date | no | Scadenza quota associativa |
| emailVerified | boolean | auto | Default: false |
| active | boolean | auto | Default: true |
| language | string | auto | Default: "it" |
| timezone | string | auto | Default: "Europe/Rome" |
| createdAt | datetime | auto | |
| updatedAt | datetime | auto | |

### Privacy

Ogni socio controlla la visibilita' dei propri dati personali:

| Campo | Default | Visibile a |
|-------|---------|-----------|
| Email | privato | Solo admin/manager |
| Telefono casa | privato | Solo admin/manager |
| Telefono lavoro | privato | Solo admin/manager |
| Cellulare | privato | Solo admin/manager |
| Indirizzo | privato | Solo admin/manager |

Il socio puo' rendere pubblici i propri contatti verso gli altri soci.

## 2.2 Operazioni

### Lista Soci

- Paginata (default 25 per pagina)
- Filtri: nome, cognome, ruolo, stato (attivo/inattivo), scadenza quota
- Ordinamento: nome, cognome, data iscrizione
- Rispetta le impostazioni di privacy

### Dettaglio Socio

- Mostra tutti i campi (con privacy applicata)
- Mostra ruoli e permessi
- Mostra qualifiche con scadenze
- Mostra storico prenotazioni recenti

### Creazione Socio (admin/manager)

- Campi obbligatori: nome, cognome, email
- Password generata automaticamente (o impostata manualmente)
- Email di benvenuto con credenziali
- Assegnazione ruolo iniziale

### Modifica Socio

- Il socio modifica i propri dati (permesso: `member:edit_own`)
- Admin/manager modifica qualsiasi socio (permesso: `member:manage`)
- Cambio email richiede verifica
- Cambio password richiede password corrente (o reset via admin)

### Disattivazione Socio

- Soft delete: l'account viene disattivato, non cancellato
- Le prenotazioni future vengono cancellate
- I dati storici vengono preservati
- Possibilita' di riattivazione

### Import CSV

- Formato: `cognome;nome;email` (separatore punto e virgola)
- Gestione duplicati: skip se email gia' presente
- Password auto-generata per nuovi account
- Report di importazione (creati, saltati, errori)

### Export

- CSV: tutti i campi (rispettando i permessi)
- Excel: stessa struttura del CSV

## 2.3 Quote Associative

### Modalita'

| Modalita' | Comportamento |
|-----------|--------------|
| Disattivata | Nessun controllo sulle quote |
| Avviso | Mostra avviso se quota scaduta, ma consente prenotazione |
| Restrittiva | Blocca le prenotazioni se la quota e' scaduta |

### Gestione

- La data di scadenza e' impostata per ciascun socio
- L'admin configura la modalita' (disattivata/avviso/restrittiva)
- Alert automatico N settimane prima della scadenza (configurabile)

## 2.4 Preferenze Utente

| Preferenza | Opzioni | Default |
|------------|---------|---------|
| Lingua | it, en, fr, de, es | it |
| Timezone | IANA timezone | Europe/Rome |
| Formato data | DD/MM/YYYY, MM/DD/YYYY | DD/MM/YYYY |
| Vista default booking | giornaliera, settimanale | giornaliera |
| Aeromobili visibili | multi-select dalla flotta | tutti |
| Istruttori visibili | multi-select dagli istruttori | tutti |
| Notifiche email | on/off | on |

## 2.5 Elenco Soci (Directory)

- Visibile a tutti i soci autenticati
- Due viste: per nome (alfabetico) e per ruolo
- Mostra: nome, ruolo, contatti (solo se resi pubblici dal socio)
- L'admin vede sempre tutti i dati

## 2.6 API Endpoints

```
GET    /api/members              # Lista soci (paginata, filtri)
GET    /api/members/:id          # Dettaglio socio
POST   /api/members              # Crea socio
PUT    /api/members/:id          # Modifica socio
DELETE /api/members/:id          # Disattiva socio
POST   /api/members/import       # Import CSV
GET    /api/members/export/csv   # Export CSV
GET    /api/members/export/excel # Export Excel
PUT    /api/members/:id/preferences # Aggiorna preferenze
GET    /api/members/directory    # Elenco soci (directory)
```
