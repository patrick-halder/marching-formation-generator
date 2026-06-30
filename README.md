# Marschaufstellung-Generator

Statische Webanwendung zur automatischen Generierung von Marschformationen für Blasorchester. Spieleranzahl pro Register eingeben, Variante wählen, Formation berechnen — fertig.

## Features

- **10 Register** mit konfigurierbarer Spieleranzahl (vorausgefüllte Standardwerte)
- **2 Varianten**: Traditionell / Melodie-Schlagzeug-Harmonie
- **"Spieler pro Reihe"** — feste Spaltenanzahl (Standard 5, einstellbar 1–20)
- **Farbcodiertes Gitter** mit Drag-and-Drop zum manuellen Umordnen
- **PNG-Export** der Formation
- **Auto-Berechnung** beim Laden der Seite
- **Dark Theme**, responsive von 320px bis 1920px
- **Kein Backend nötig** — Demo-Modus generiert Formationen lokal

## Lokal starten

```bash
cd public
python -m http.server 8080
```

Dann im Browser öffnen: **http://localhost:8080**

> ES-Module funktionieren nicht über `file://` — ein lokaler Server ist erforderlich.

## Projektstruktur

```
public/
├── index.html              # Hauptseite (Deutsche UI, Dark Theme)
├── css/styles.css          # CSS Custom Properties, responsive Layout
└── js/
    ├── main.js             # Orchestrierung, PNG-Export, Auto-Berechnung
    ├── state.js            # Konstanten + Zustandsverwaltung
    ├── validation.js       # Eingabevalidierung (deutsche Fehlermeldungen)
    ├── grid-calculator.js  # Gitterberechnung (feste Spaltenanzahl)
    ├── api-client.js       # API-Client mit Demo-Modus
    ├── input-form.js       # DOM-Interaktion Eingabeformular
    └── grid-renderer.js    # Gitter-Rendering + Drag-and-Drop
```

## Deployment (GitLab Pages)

Push auf `main` → GitLab CI kopiert `public/` → GitLab Pages serviert die Seite.

```yaml
# .gitlab-ci.yml
pages:
  image: alpine:latest
  stage: deploy
  script:
    - echo "Publishing"
  artifacts:
    paths:
      - public
  only:
    - main
```

**Voraussetzung:** Ein aktiver GitLab Runner muss dem Projekt zugewiesen sein.

## Tech-Stack

| Komponente | Technologie |
|-----------|-------------|
| Frontend | HTML + CSS + JavaScript (ES-Module, kein Build-Step) |
| PNG-Export | html2canvas (CDN) |
| Hosting | GitLab Pages |
| Tests | Vitest + fast-check |

## Demo-Modus

Die App enthält einen lokalen Mock-Generator (`DEMO_MODE = true` in `api-client.js`), der Formationen ohne echtes Backend berechnet. Für den produktiven Einsatz:

1. `DEMO_MODE = false` setzen
2. `API_ENDPOINT` auf die URL des Optimierungs-Servers ändern

## Farbpalette

| Register | Farbe | Hex |
|----------|-------|-----|
| Flöten | Cyan | `#06b6d4` |
| Klarinetten | Königsblau | `#2563eb` |
| Saxophone | Pink | `#ec4899` |
| Hörner | Smaragd | `#059669` |
| Trompeten | Gold | `#eab308` |
| Flügelhörner | Violett | `#a855f7` |
| Tenorhorn/Bariton | Mint | `#10b981` |
| Posaunen | Orange | `#e85d04` |
| Tuben | Rot | `#dc2626` |
| Schlagzeug | Grau | `#6b7280` |
