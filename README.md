# Sala giochi

Giochi di carte da tavolo per telefono: da solo, contro i bot o online con gli amici. Funziona nel browser e si può installare come app (PWA).

## Come andare a giocare

1. Carica il contenuto della cartella `hilo/` su GitHub (repository con **GitHub Pages** attivo: Settings → Pages → branch `main`, cartella `/ (root)`).
2. Apri `https://TUONOME.github.io/NOMEREPO/` dal telefono.
3. Per installarla: menu del browser → «Aggiungi a Home» (iPhone: Condividi → «Aggiungi a Home»).
4. Scegli un gioco dalla Home e premi «Inizia la partita».

## I giochi

| Gioco | Giocatori | Note |
|---|---|---|
| **Blackjack Hi-Lo** | solo, con bot o amici (fino a 7 posti) | Allenati a contare le carte. Fiches 1/5/10/25/50/100/500, puntata libera sopra il minimo. |
| **Poker Texas Hold'em** | bot o amici | No limit, blinds a scelta, legenda delle mani e probabilità. |
| **Briscola** | 2, 3 o 4 (a coppie) | Carte napoletane. |
| **Scopa** | 2, 3 o 4 (a coppie) | Scope, settebello, primiera; a 11 o 21 punti. |
| **Bisca** | da 2 a 8 | Dichiari le prese, chi sbaglia perde vite. Con una carta sola non vedi la tua. |

## Giocare con gli amici

- Chi crea la stanza sceglie le regole e riceve un **codice di 5 lettere**: il suo telefono fa da tavolo.
- Gli amici scelgono «Con amici», scrivono il codice e premono «Entra».
- Se uno di voi è con i **dati mobili** o su reti diverse, apri **⚙ Rete e dati mobili** dalla Home: imposta un relay (account gratuito su metered.ca), premi «Prova la connessione» e «Copia il link per gli amici». Serve a tutti i giocatori.

## Aiuti per imparare

- **Livello dei bot:** basso, medio o alto in ogni gioco.
- **Blackjack:** conteggio a vista, valore +1/0/−1 sulle carte, consiglio su mossa, assicurazione e puntata.
- **Poker:** legenda, probabilità di fine mano, consiglio (probabilità di vincere contro costo).
- **Briscola, Scopa, Bisca:** pulsante «Aiuti» con statistiche e la carta consigliata evidenziata.

Gli aiuti si accendono e spengono anche durante la partita.

## Per chi sviluppa

`python3 build.py` (serve `npm install` per esbuild) genera `src.html` e `dist/hilo.zip`. Sorgenti: `*.js`, `body.html`, `style.css`.
