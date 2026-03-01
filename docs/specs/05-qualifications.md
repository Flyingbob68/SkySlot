# 05 - Qualifiche e Licenze

## 5.1 Definizione Qualifica

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:---:|------|
| id | cuid | auto | Chiave primaria |
| name | string | si | Nome qualifica (es. PPL, CPL, SEP, MEP, IR) |
| hasExpiry | boolean | si | Se la qualifica ha una data di scadenza |
| description | string | no | Descrizione estesa |
| createdAt | datetime | auto | |

## 5.2 Qualifica del Socio

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:---:|------|
| id | cuid | auto | |
| memberId | FK | si | Socio |
| qualificationId | FK | si | Qualifica |
| expiryDate | date | condizionale | Obbligatorio se hasExpiry = true |
| noAlert | boolean | auto | Default: false. Se true, nessun alert scadenza |
| createdAt | datetime | auto | |
| updatedAt | datetime | auto | |

Vincolo: combinazione (memberId, qualificationId) univoca.

## 5.3 Requisiti Qualifica per Aeromobile

| Campo | Tipo | Note |
|-------|------|------|
| id | cuid | |
| aircraftId | FK | Aeromobile |
| checkGroup | integer | Gruppo di controllo (AND tra gruppi) |
| qualificationId | FK | Qualifica richiesta (OR nello stesso gruppo) |

### Logica di Verifica

```
Per ogni checkGroup dell'aeromobile:
  il pilota deve possedere ALMENO UNA qualifica del gruppo
  con data di scadenza non superata (se hasExpiry = true)
I checkGroup sono in AND: TUTTI devono essere soddisfatti
```

**Esempio**: C172 richiede `(PPL OR GPL) AND (SEP Rating)`
- checkGroup 1: PPL, GPL
- checkGroup 2: SEP

## 5.4 Modalita' di Controllo

Configurabile dall'admin per l'intero club:

| Modalita' | Comportamento |
|-----------|--------------|
| Disattivato | Nessun controllo qualifiche |
| Avviso | Mostra warning ma consente la prenotazione (con conferma) |
| Restrittivo | Blocca la prenotazione se le qualifiche non sono soddisfatte |

Il controllo si applica SOLO ai voli SOLO. I voli con istruttore (DUAL) bypассano il controllo.

## 5.5 Alert Scadenze

- Ogni socio puo' configurare il proprio anticipo di alert (default: 4 settimane)
- Il sistema mostra un banner di avviso quando una qualifica sta per scadere
- Notifica email automatica alla scadenza configurata
- Il socio puo' disabilitare l'alert per singola qualifica (`noAlert = true`)

## 5.6 Operazioni

### Gestione Qualifiche (Admin)

- CRUD delle definizioni di qualifica
- Assegnazione/rimozione qualifiche ai soci
- Aggiornamento date di scadenza
- Report qualifiche in scadenza

### Gestione Propria (Socio)

- Con permesso `qualification:edit_own`: puo' aggiornare le proprie date di scadenza
- Visualizzazione delle proprie qualifiche e scadenze

## 5.7 API Endpoints

```
GET    /api/qualifications                    # Lista definizioni qualifiche
POST   /api/qualifications                    # Crea qualifica
PUT    /api/qualifications/:id                # Modifica qualifica
DELETE /api/qualifications/:id                # Elimina qualifica
GET    /api/members/:id/qualifications        # Qualifiche di un socio
POST   /api/members/:id/qualifications        # Assegna qualifica a socio
PUT    /api/members/:id/qualifications/:qid   # Aggiorna scadenza
DELETE /api/members/:id/qualifications/:qid   # Rimuovi qualifica
GET    /api/qualifications/expiring           # Report qualifiche in scadenza
```
