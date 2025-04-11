# 🖐️ Hand Gesture Translator - MediaPipe React App

Dit project is een handgebaren-herkenningsapplicatie gebouwd met React, MediaPipe Tasks Vision, en een zelfgetraind KNN-model op hand-landmarks. De gebruiker kan in realtime handgebaren maken, en de app herkent het bijbehorende commando zoals "good job" of "call me".

---

## 📦 Functionaliteiten

- Live webcam-integratie met MediaPipe HandLandmarker
- Gebruikt KNN op basis van eigen getrainde JSON-gebaardata
- Handgebaren verzamelen via een Trainer-interface
- JSON-bestanden opslaan & laden als model
- Accuracy evaluatie van het getrainde model
- Mooie UI & responsive design

---

## 🛠️ Installatie

1. Clone dit project:

```bash
  git clone https://github.com/jouw-gebruiker/hand-gesture-translator.git
  cd hand-gesture-translator
```

2. Installeer dependencies:

```bash
  npm install
```

3. Start de development server:

```bash
  npm run dev
```

---

## 🧭 Routes

| Route       | Functie                                |
|-------------|-----------------------------------------|
| `/`         | Live voorspelling met camera            |
| `/trainer`  | Gebaren vastleggen & model evaluatie    |

---

## 🧠 Werking model

- Het model gebruikt **KNN-classificatie** op MediaPipe-handlandmarks.
- Alle gebaren worden opgeslagen als `JSON` vectoren in `/data/`.
- Bij live voorspelling worden webcamlandmarks vergeleken met deze vectoren.
- Het systeem voorspelt het gebaar met de meeste overeenkomsten (K=3).

---



## 📁 Directory structuur

```
src/
├── App.jsx             # Gebruikersapplicatie (voorspelling)
├── Trainer.jsx         # Trainingsinterface (capture + accuracy)
├── main.jsx            # Routerconfiguratie
├── style.css           # UI-styling
└── /data               # JSON-bestanden met getrainde gebaren
```

---

## 🚀 Toekomstige uitbreidingen

- TensorFlow.js model gebruiken voor NN-classificatie
- Spraakoutput toevoegen per gebaar
- Dynamische datatraining vanuit meerdere gebruikers

