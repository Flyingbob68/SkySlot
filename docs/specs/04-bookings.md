# 04 - Sistema di Prenotazione

## 4.1 Tipi di Prenotazione (Slot)

| Tipo | Codice | Descrizione |
|------|--------|-------------|
| Volo Solo | `SOLO` | Pilota senza istruttore |
| Volo con Istruttore | `DUAL` | Pilota + istruttore assegnato |
| Manutenzione | `MAINTENANCE` | Blocco aeromobile (non una prenotazione utente) |

## 4.2 Dati Prenotazione

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:---:|------|
| id | cuid | auto | Chiave primaria |
| startDate | datetime | si | In UTC, arrotondato a 15 min |
| endDate | datetime | si | In UTC, arrotondato a 15 min |
| aircraftId | FK | si | Aeromobile prenotato |
| memberId | FK | si | Pilota che prenota |
| slotType | enum | si | SOLO, DUAL, MAINTENANCE |
| instructorId | FK | no | Obbligatorio se slotType = DUAL |
| freeSeats | integer | auto | Posti passeggero disponibili |
| comments | string | no | Note libere (se abilitato dal club) |
| createdAt | datetime | auto | |
| updatedAt | datetime | auto | |
| createdBy | FK | auto | Chi ha creato la prenotazione |

## 4.3 Regole di Validazione

### Vincoli Temporali

| Regola | Descrizione | Configurabile |
|--------|-------------|:---:|
| No prenotazioni nel passato | startDate deve essere nel futuro (>= now + 15min) | no |
| Ordine date | endDate > startDate | no |
| Orario operativo | Prenotazione entro `firstHour` - `lastHour` del club | si |
| Limite prenotazione anticipata | Max N settimane in anticipo | si |
| Limite durata | Max N ore per prenotazione | si |
| Durata minima istruzione | Min N minuti per voli DUAL | si |
| Granularita' 15 min | Tutte le ore arrotondate a quarti d'ora | no |

### Vincoli di Conflitto

| Regola | Descrizione |
|--------|-------------|
| No sovrapposizione aeromobile | Lo stesso aeromobile non puo' avere due prenotazioni sovrapposte |
| No sovrapposizione pilota | Lo stesso pilota non puo' avere due prenotazioni sovrapposte |
| No sovrapposizione istruttore | Lo stesso istruttore non puo' avere due prenotazioni sovrapposte |
| Pilota != Istruttore | Il pilota e l'istruttore devono essere persone diverse |

### Vincoli di Abilitazione

| Regola | Descrizione | Modalita' |
|--------|-------------|-----------|
| Aeromobile prenotabile | `nonBookable` deve essere false | Bloccante |
| Qualifiche pilota | Per voli SOLO, il pilota deve avere le qualifiche richieste | Avviso/Bloccante |
| Disponibilita' istruttore | Per voli DUAL, l'istruttore deve essere disponibile | Bloccante |
| Quota associativa | La quota del socio non deve essere scaduta | Avviso/Bloccante |
| Qualifiche non scadute | Le qualifiche del pilota non devono essere scadute | Avviso/Bloccante |

### Override con Permessi

| Permesso | Bypassa |
|----------|---------|
| `booking:override_date_limit` | Limite prenotazione anticipata |
| `booking:override_duration` | Limite durata massima |
| `booking:override_instructor` | Disponibilita' istruttore |

## 4.4 Operazioni

### Creazione Prenotazione

1. Utente seleziona: data/ora inizio, data/ora fine, aeromobile, tipo slot
2. Se DUAL: seleziona istruttore
3. Sistema valida tutte le regole
4. Se validazione OK: crea prenotazione con lock pessimistico (transaction + SELECT FOR UPDATE)
5. Invia notifica email al pilota (e all'istruttore se DUAL)

### Modifica Prenotazione

- Stesse regole di validazione della creazione
- Solo il proprietario o chi ha `booking:create_any` puo' modificare
- Log della modifica (vecchi valori -> nuovi valori)
- Notifica ai soggetti coinvolti (vecchi e nuovi)

### Cancellazione Prenotazione

- Solo il proprietario o chi ha `booking:create_any` puo' cancellare
- Prenotazioni in corso: l'ora di fine viene portata all'ora corrente
- Log della cancellazione
- Notifica ai soggetti coinvolti
- Se allocatore tipo 1: trigger auto-upgrade sulle altre prenotazioni

### Lista Prenotazioni

- Per utente: le proprie prenotazioni (passate e future)
- Per aeromobile: tutte le prenotazioni su un aeromobile
- Filtri: data, aeromobile, pilota, istruttore, tipo slot

## 4.5 Griglia di Prenotazione (Calendario)

### Viste

| Vista | Contenuto |
|-------|-----------|
| Giornaliera | Tutti gli aeromobili e istruttori per un giorno |
| Settimanale aeromobile | Un aeromobile per 7 giorni |
| Settimanale istruttore | Un istruttore per 7 giorni |

### Elementi Visuali

- **Righe**: slot temporali da `firstHour` a `lastHour` (15 min ciascuno)
- **Colonne**: aeromobili e/o istruttori
- **Colori sfondo**: giorno / crepuscolo / notte (basati su alba/tramonto)
- **Colori prenotazione**:
  - Volo solo: colore A
  - Volo con istruttore: colore B
  - Manutenzione: colore C
  - Disponibilita' istruttore: overlay colorato
- **Click su cella vuota**: apre form prenotazione con ore precompilate
- **Click su prenotazione**: mostra dettagli e opzioni (modifica/cancella)

### Alba/Tramonto

- Calcolati in base alle coordinate ICAO dell'aeroporto del club
- Visualizzazione di:
  - **Giorno aeronautico** (aero sunrise → aero sunset)
  - **Crepuscolo** (sunrise → aero sunrise, aero sunset → sunset)
  - **Notte** (prima di sunrise, dopo sunset)

## 4.6 Concorrenza

Il sistema di prenotazione deve gestire accessi concorrenti:

1. Lock pessimistico: `SELECT ... FOR UPDATE` sulla tabella booking nel range temporale
2. Transazione PostgreSQL per tutta l'operazione di creazione/modifica
3. In caso di conflitto: errore chiaro "Lo slot richiesto non e' piu' disponibile"
4. Retry suggerito all'utente con dati aggiornati

## 4.7 API Endpoints

```
GET    /api/bookings                # Lista prenotazioni (filtri)
GET    /api/bookings/:id            # Dettaglio prenotazione
POST   /api/bookings                # Crea prenotazione
PUT    /api/bookings/:id            # Modifica prenotazione
DELETE /api/bookings/:id            # Cancella prenotazione
GET    /api/bookings/calendar       # Dati griglia calendario
GET    /api/bookings/my             # Le mie prenotazioni
GET    /api/bookings/conflicts      # Verifica conflitti (pre-creazione)
```
