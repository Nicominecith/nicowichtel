# Wichtel Gift Drop – Netlify

## Die Codes ändern (nur eine Datei)
Öffne ausschließlich `codes.json` und trage dort deine beiden Codes ein:

```json
{
  "accessCode": "HIER_DEIN_ZUGANGSCODE",
  "voucherCode": "HIER_DEIN_GUTSCHEINCODE"
}
```

- `accessCode`: Code, den Gäste eingeben müssen, um die Webseite zu öffnen.
- `voucherCode`: der Gutschein-Code, der nach erfolgreichem Zugang angezeigt wird.

Achte darauf, die Anführungszeichen und Kommas in der JSON-Datei beizubehalten.

## Sound & Musik
- Alle Buttons und Links nutzen den Klick-Sound `assets/Menu-click.mp3`. Dazu gibt es einen kurzen Erfolgs- und einen Fehlerton beim Code.
- Hintergrundmusik: bei jedem Besuch wird zufällig einer der Tracks in `assets/music/menu-1.mp3` bis `menu-9.mp3` gewählt, danach geht es zufällig weiter. Neue Tracks: Datei ablegen und in `script.js` bei `MUSIC_TRACKS` eintragen.
- Oben rechts lassen sich Musik und Klick-Sounds getrennt ausschalten (wird im Browser gespeichert).
- Browser spielen Audio erst nach der ersten Berührung ab.

## Spiele
Oben bei den Icons lässt sich das Spiel wählen (Brawl Stars, Clash of Clans, Clash Royale, Hay Day, Boom Beach). Texte und Links stehen in `script.js` bei `GAMES`.

## Netlify
1. ZIP entpacken.
2. Auf https://app.netlify.com/ → **Add new site → Deploy manually** gehen.
3. Den entpackten Projektordner mit `index.html`, `codes.json`, `script.js`, `style.css`, `netlify.toml` und `assets/` hochladen.
4. Nach Änderungen an `codes.json` den Ordner erneut deployen.

Keine Build-Einstellungen oder Umgebungsvariablen erforderlich. `netlify.toml` sorgt dafür, dass `codes.json` nie aus dem Cache kommt.

## Ablaufdatum
Die Seite blendet sich ab **30.12.2026, 00:00 Uhr deutscher Zeit (Europe/Berlin)** aus. Bereits heruntergeladene Kopien lassen sich dadurch nicht zentral sperren.

## Wichtiger Sicherheitshinweis
`codes.json` wird von der Webseite geladen und ist bei einem statischen Netlify-Hosting öffentlich abrufbar. Der Zugangscode und der Gutscheincode sind daher nicht geheim gegenüber technisch versierten Besuchern. Das ist eine einfache Zugangsschranke für eine private Wichtel-Aktion, keine sichere Authentifizierung. Für echten Schutz muss die Prüfung serverseitig über eine Netlify Function erfolgen und der Gutschein darf erst nach erfolgreicher Prüfung ausgegeben werden.

Private Fan-/Geschenkseite, kein offizieller Supercell-Auftritt. Marken und bereitgestellte Assets bleiben Eigentum ihrer jeweiligen Rechteinhaber.
