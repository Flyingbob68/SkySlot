# 03 - Gestione Aeromobili

## 3.1 Dati Aeromobile

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:---:|------|
| id | cuid | auto | Chiave primaria |
| callsign | string | si | Immatricolazione univoca (es. I-ABCD) |
| type | string | si | Tipo aeromobile (es. C172, PA28, C152) |
| seats | integer | si | Posti disponibili (escluso pilota) |
| hourlyRate | decimal | no | Costo orario |
| nonBookable | boolean | auto | Default: false (in manutenzione) |
| displayOrder | integer | auto | Ordine di visualizzazione nel calendario |
| comments | string | no | Note libere (visibili in tooltip) |
| active | boolean | auto | Default: true |
| createdAt | datetime | auto | |
| updatedAt | datetime | auto | |

## 3.2 Operazioni

### Lista Aeromobili

- Ordinata per `displayOrder`
- Filtri: tipo, stato (attivo/inattivo, prenotabile/in manutenzione)
- Mostra: immatricolazione, tipo, posti, stato, costo orario

### Dettaglio Aeromobile

- Tutti i campi
- Qualifiche richieste
- Stato corrente (disponibile, prenotato, in manutenzione)
- Storico prenotazioni recenti

### Creazione/Modifica

- Permesso richiesto: `aircraft:manage`
- Validazione: callsign univoco, posti numerico > 0
- Modifica del tipo non invalida prenotazioni esistenti

### Messa in Manutenzione (Freeze)

- Permesso richiesto: `aircraft:freeze`
- Imposta `nonBookable = true`
- Crea automaticamente uno slot MAINTENANCE che blocca il calendario
- Le prenotazioni esistenti durante il periodo di manutenzione:
  - **Allocatore tipo 0** (specifico): vengono cancellate con notifica ai soci
  - **Allocatore tipo 1** (per tipo): vengono spostate su un altro aeromobile dello stesso tipo, se disponibile

### Disattivazione

- Soft delete: `active = false`
- Non appare piu' nel calendario
- Dati storici preservati

## 3.3 Allocatore Aeromobili

### Regola 0: Aeromobile Specifico (Default)

- Il socio sceglie un aeromobile specifico
- Nessuna sostituzione automatica

### Regola 1: Allocazione per Tipo

- Il socio sceglie il **tipo** di aeromobile (es. "C172")
- Il sistema assegna automaticamente l'aeromobile migliore disponibile dello stesso tipo
- L'ordine di preferenza e' determinato da `displayOrder` (piu' basso = preferito)
- **Auto-upgrade**: quando un aeromobile si libera (cancellazione), le prenotazioni su aeromobili meno preferiti vengono spostate su quello migliore
- **Auto-downgrade**: quando un aeromobile va in manutenzione, le prenotazioni vengono spostate sul prossimo disponibile
- In entrambi i casi viene inviata notifica al socio

## 3.4 Requisiti Qualifiche per Aeromobile

- Ad ogni aeromobile possono essere associati requisiti di qualifica
- Logica a due livelli:
  - **Livello (checkGroup)**: condizioni in AND (il pilota deve soddisfare TUTTI i livelli)
  - **Qualifiche nello stesso livello**: condizioni in OR (il pilota deve avere ALMENO UNA qualifica del livello)
- Esempio: per un C172 servono (PPL OR GPL) AND (SEP Rating)
- Controllo applicato solo ai voli solo (non ai voli con istruttore)
- Due modalita': avviso (consente con conferma) o restrittiva (blocca)

## 3.5 Visualizzazione Callsign

- Configurabile a livello di club: mostrare o nascondere l'immatricolazione
- Se nascosta, si mostra solo il tipo e il numero d'ordine

## 3.6 API Endpoints

```
GET    /api/aircraft              # Lista aeromobili
GET    /api/aircraft/:id          # Dettaglio aeromobile
POST   /api/aircraft              # Crea aeromobile
PUT    /api/aircraft/:id          # Modifica aeromobile
DELETE /api/aircraft/:id          # Disattiva aeromobile
POST   /api/aircraft/:id/freeze   # Metti in manutenzione
POST   /api/aircraft/:id/unfreeze # Rimuovi manutenzione
GET    /api/aircraft/:id/qualifications # Qualifiche richieste
PUT    /api/aircraft/:id/qualifications # Aggiorna requisiti qualifiche
```
