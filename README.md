# 📘 StudyDAO

**StudyDAO** is a decentralized study platform that empowers students to form study groups, log focused learning sessions, and earn $STUDY and ARKT tokens as incentives. With a Firebase-powered backend and smart contracts managing token rewards and staking, the app integrates learning, collaboration, and Web3 mechanics into one seamless experience.

## 🌐 Live App
👉 **[https://study-dao-rose.vercel.app](https://study-dao-rose.vercel.app)**

## 🌐 App Video Demo
👉 **[https://youtu.be/RyHTBs9Vip8]**

## 🚀 Features
- 📚 **Create & Join Study Groups**  
  Build or discover decentralized study communities.
- ⏱️ **Log Study Sessions**  
  Track your focus time and boost accountability.
- 🎁 **Earn Token Rewards**  
  Receive 1 $STUDY token for every 10 minutes of focused study time.
- 💰 **Staking System**  
  Stake tokens to unlock group perks and earn multipliers.
- 🔐 **Decentralized Governance (Coming Soon)**  
  Let study groups vote on key changes or access rules using tokens.

## 📦 Resources Marketplace
Access a growing pool of educational support powered by $STUDY tokens:
- 👨‍🏫 **Pay Tutors with Tokens**  
  Hire verified peer or expert tutors using your earned tokens.
- 📘 **Buy Premium Learning Materials**  
  Purchase curated study materials like practice problems, guides, or flashcards.
- 🤝 **Student-Created Community Resources**  
  Access and contribute personal notes, summaries, and study packs created by other learners.

## 🛠️ Tech Stack
- **Smart Contracts**: Solidity
- **Frontend**: React, TailwindCSS, Vite
- **Blockchain Interaction**: Ethers.js
- **Backend**: Firebase (Authentication & Real-time Database)
- **Wallet Login**: MetaMask
- **Deployment**: Vercel (Frontend)

## 📂 Folder Structure
```
study-dao/
├── contracts/      # Solidity smart contracts
├── frontend/       # React frontend app with Firebase integration
├── docs/           # Flowcharts, diagrams, pitch deck
├── images/         # Screenshots and media
├── videos/         # Demo walkthrough
```

## 📦 Local Setup
### Prerequisites
- Node.js
- MetaMask
- Firebase project (set up your config in `frontend/src/firebaseConfig.js`)

### Run the App
```bash
git clone git@github.com:Blockbridge-Network/Team-StudyDao.git
cd Team-StudyDao/frontend
npm install
npm run dev
```

## 🔐 Firebase Setup
In `frontend/src/firebaseConfig.js`, configure Firebase:
```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_APP.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_APP.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
```
> You must enable Email/Password auth in the Firebase Console.

## 📚 Documentation
* 📜 `docs/StudyDAO Pitch.pdf` — Project overview
* 🧠 `docs/flowchart.png` — Architecture & interaction flow
* 📄 Smart contract ABIs and logic in `contracts/`

## 🤝 Contributing
Pull requests are welcome! Please open an issue first to discuss major changes.

## 🛣️ Roadmap
* ✅ Study token + contract system
* ✅ Tokenized study sessions
* ✅ Tutor payments with tokens
* ✅ Firebase backend integration
* ⏳ DAO voting for group rules
* ⏳ NFT badges for study milestones
* ⏳ Leaderboards and progress tracking

## 📜 License
MIT License © 2025 StudyDAO Team
