# 08 - Notifiche

## 8.1 Notifiche Email

### Tipi di Notifica

| Evento | Destinatari | Contenuto |
|--------|-------------|-----------|
| Prenotazione creata | Pilota, Istruttore (se DUAL) | Dettagli prenotazione |
| Prenotazione modificata | Pilota, Istruttore (vecchi e nuovi) | Vecchi/nuovi dettagli |
| Prenotazione cancellata | Pilota, Istruttore | Dettagli della prenotazione cancellata |
| Prenotazione auto-spostata | Pilota | Nuovo aeromobile assegnato (allocatore) |
| Benvenuto nuovo socio | Socio | Credenziali di accesso |
| Reset password | Socio | Link per reset |
| Verifica email | Socio | Link di conferma |
| Qualifica in scadenza | Socio | Qualifica e data scadenza |
| Quota in scadenza | Socio | Data scadenza quota |

### Configurazione

- Ogni socio puo' attivare/disattivare le notifiche email
- Le notifiche di sicurezza (reset password, verifica email) vengono sempre inviate
- L'indirizzo mittente e' configurato a livello di club (`mailFromAddress`)

### Template

- Template email in HTML con fallback testo
- Personalizzati con i dati della prenotazione e del socio
- Multilingua (in base alla lingua del destinatario)

## 8.2 Notifiche In-App (Futura Evoluzione)

Previste per una fase successiva:
- Banner in-app per qualifiche/quote in scadenza
- Badge di notifiche non lette
- Centro notifiche con storico

## 8.3 Invio Email

- Backend: utilizzare un servizio SMTP configurabile
- Queue asincrona per non bloccare le operazioni
- Retry automatico in caso di fallimento (max 3 tentativi)
- Log di tutte le email inviate (audit)

## 8.4 API Endpoints

```
GET    /api/notifications/preferences    # Preferenze notifiche utente
PUT    /api/notifications/preferences    # Aggiorna preferenze
```
