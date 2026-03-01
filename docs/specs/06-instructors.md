# 06 - Gestione Istruttori

## 6.1 Profilo Istruttore

Un istruttore e' un socio con ruolo `instructor` e dati aggiuntivi:

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:---:|------|
| id | cuid | auto | |
| memberId | FK | si | Collegamento al socio |
| trigram | string(3) | si | Sigla univoca (es. "MCR") |
| displayOrder | integer | auto | Ordine nel calendario |

## 6.2 Disponibilita' Settimanale Ricorrente

Definisce gli orari in cui l'istruttore e' normalmente disponibile, su base settimanale.

| Campo | Tipo | Note |
|-------|------|------|
| id | cuid | |
| instructorId | FK | |
| startDay | integer | Giorno della settimana (0=lunedi', 6=domenica) |
| startTime | time | Ora inizio (HH:MM, quarti d'ora) |
| endDay | integer | Giorno della settimana |
| endTime | time | Ora fine (HH:MM, quarti d'ora) |

Puo' attraversare il confine del giorno (es. sabato 14:00 - domenica 12:00).

## 6.3 Eccezioni alla Disponibilita'

Sovrascrivono la disponibilita' ricorrente per date specifiche.

| Campo | Tipo | Note |
|-------|------|------|
| id | cuid | |
| instructorId | FK | |
| startDate | datetime | Data/ora inizio (UTC) |
| endDate | datetime | Data/ora fine (UTC) |
| isPresent | boolean | true = presente (override disponibile), false = assente (override indisponibile) |

## 6.4 Algoritmo di Risoluzione Disponibilita'

La disponibilita' effettiva si calcola cosi':

1. **Base**: tutti gli slot sono **indisponibili**
2. **Applica ricorrenti**: gli slot coperti da `regularAvailability` diventano **disponibili**
3. **Applica eccezioni presenza**: gli slot coperti da eccezioni con `isPresent=true` diventano **disponibili**
4. **Applica eccezioni assenza**: gli slot coperti da eccezioni con `isPresent=false` diventano **indisponibili**

L'assenza ha priorita' sulla presenza (in caso di sovrapposizione tra eccezioni).

Granularita': 15 minuti (672 quarti d'ora per settimana).

## 6.5 Operazioni

### Gestione Disponibilita' (Istruttore)

- L'istruttore gestisce la propria disponibilita' ricorrente
- L'istruttore aggiunge/rimuove eccezioni
- Visualizzazione: calendario settimanale con slot disponibili/indisponibili

### Gestione Disponibilita' (Admin)

- Con permesso `instructor:manage_availability`
- Puo' modificare la disponibilita' di qualsiasi istruttore
- Puo' forzare eccezioni (es. ferie collettive)

### Vista Istruttore nel Calendario

- Nel calendario prenotazioni, la disponibilita' dell'istruttore e' visualizzata come overlay
- L'istruttore puo' filtrare per vedere solo la propria disponibilita'

## 6.6 Regole di Business

- Un volo DUAL puo' essere prenotato solo se l'istruttore e' disponibile durante l'intero slot
- Il permesso `booking:override_instructor` bypassa il controllo di disponibilita'
- La cancellazione di un'eccezione di presenza puo' invalidare prenotazioni DUAL gia' esistenti (notifica al socio)

## 6.7 API Endpoints

```
GET    /api/instructors                           # Lista istruttori
GET    /api/instructors/:id                       # Dettaglio istruttore
GET    /api/instructors/:id/availability          # Disponibilita' calcolata (per range date)
GET    /api/instructors/:id/regular-availability  # Disponibilita' ricorrente
PUT    /api/instructors/:id/regular-availability  # Aggiorna disponibilita' ricorrente
GET    /api/instructors/:id/exceptions            # Eccezioni
POST   /api/instructors/:id/exceptions            # Crea eccezione
PUT    /api/instructors/:id/exceptions/:eid       # Modifica eccezione
DELETE /api/instructors/:id/exceptions/:eid       # Elimina eccezione
```
