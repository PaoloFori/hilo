# Sala giochi

Giochi di carte da tavolo per telefono e computer: da solo, contro i bot o online con gli amici. Funziona nel browser e si può installare come app (PWA).

## Come andare a giocare

1. Carica il contenuto della cartella `hilo/` su GitHub (repository con **GitHub Pages** attivo: Settings → Pages → branch `main`, cartella `/ (root)`).
2. Apri `https://TUONOME.github.io/NOMEREPO/` dal telefono.
3. Per installarla: menu del browser → «Aggiungi a Home» (iPhone: Condividi → «Aggiungi a Home»).
4. Dalla Home scegli **con chi giochi** (da solo, con i bot, con gli amici), poi il gioco, poi le impostazioni e premi «Inizia la partita».

Sul computer l'app si apre al centro dello schermo in una colonna più larga; sul telefono occupa tutto lo schermo.

## I giochi

| Gioco | Giocatori | Note |
|---|---|---|
| **Blackjack Hi-Lo** | solo, con bot o amici (fino a 7 posti) | Allenati a contare le carte. Fiches 1/5/10/25/50/100/500, puntata libera sopra il minimo. Side bet facoltative: Perfect Pairs e 21+3. Dopo lo split degli assi puoi continuare a chiedere carta. |
| **Poker Texas Hold'em** | bot o amici | No limit, blinds a scelta, legenda delle mani e probabilità. |
| **Briscola** | 2, 3 o 4 (a coppie) | Carte napoletane (40 carte). |
| **Scopa** | 2, 3 o 4 (a coppie) | Carte napoletane. Scope, settebello, primiera; a 11 o 21 punti. |
| **Bisca** | da 2 a 8 | Carte napoletane. Dichiari le prese, chi sbaglia perde vite. Con una carta sola non vedi la tua. |

## Giocare con gli amici

- Chi crea la stanza sceglie le regole e riceve un **codice di 5 lettere**: il suo dispositivo fa da tavolo.
- Gli amici scelgono «Con gli amici», il gioco, scrivono il codice e premono «Entra».

### A cosa serve «Impostazioni di rete»

La partita online non passa da un server di gioco: i dispositivi si collegano direttamente fra loro. Sullo stesso Wi‑Fi di solito funziona da solo. Con i **dati mobili** o reti diverse la connessione può essere bloccata e serve un «relay» (server TURN) che fa da ponte.

La schermata si trova in «Con gli amici» → «Non riesci a collegarti?». Da solo o contro i bot non serve. Se la stanza non si collega: «Prova la connessione», poi imposta un relay gratuito (account su metered.ca), premi «Copia il link per gli amici» e mandalo a chi deve entrare.

## Storico

Dalla Home, «Storico delle partite»: ogni partita finita (blackjack, poker, briscola, scopa, bisca) viene salvata con risultato e tipo di tavolo, con percentuale di vittorie per gioco. La scheda «Blackjack: conteggio» tiene le statistiche del conteggio Hi-Lo con i grafici. I dati restano sul dispositivo.

## Aiuti per imparare

- **Livello dei bot:** basso, medio o alto in ogni gioco.
- **Blackjack:** conteggio a vista, valore +1/0/−1 sulle carte, consiglio su mossa, assicurazione e puntata.
- **Poker:** legenda, probabilità di fine mano, consiglio (probabilità di vincere contro costo). A fine mano un riquadro mostra chi vince, con quale combinazione, le carte di tutti e il motivo (es. «decide il kicker, A contro Q»); le cinque carte vincenti sono evidenziate.
- **Briscola, Scopa, Bisca:** pulsante «Aiuti» con statistiche e la carta consigliata evidenziata.

Gli aiuti si accendono e spengono anche durante la partita.

## Per chi sviluppa

Nessuna build: `index.html` (struttura), `style.css` (stili), `app.js` (logica dei giochi, della rete e dell'interfaccia) e `peerjs.min.js`. Basta servire la cartella con un server statico, ad esempio `python3 -m http.server`. Quando cambi un file, aumenta il numero di `CACHE` in `sw.js` per far aggiornare la PWA.
