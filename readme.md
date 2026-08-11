# Sai Vinoth — AI Portfolio

An interactive 3D WebGL developer portfolio for **Sai Vinoth** featuring **Sai AI**, an open-weight Groq AI assistant (`openai/gpt-oss-20b`), interactive 3D areas, physics, and project discovery.

Live Portfolio: [https://saivinoth.netlify.app/](https://saivinoth.netlify.app/)  
GitHub Profile: [https://github.com/SaiVinoth17](https://github.com/SaiVinoth17)

---

## Features

- **Interactive 3D Experience**: Three.js + WebGPU / WebGL environment with physics (Rapier), driving vehicle, interactive project zones, and easter eggs.
- **Sai AI Assistant**: Powered by Groq's open-weight model (`openai/gpt-oss-20b`) with real-time SSE streaming, requirement matching, Hire Mode project discovery flow, and anti-hallucination boundaries.
- **Featured Projects**:
  1. **Nilgiris Explorers** — Tourism & Travel platform ([https://nilgirisexplorers.com/](https://nilgirisexplorers.com/))
  2. **Gaming Kingdom** — Gaming hub platform ([https://thegamingkingdom.netlify.app/](https://thegamingkingdom.netlify.app/))
  3. **Ooty Mistwings** — Resort & hospitality platform ([https://ootymistwings.com/](https://ootymistwings.com/))
  4. **House Of Petalss** — Floral e-commerce shopfront ([https://houseofpetalss.netlify.app/](https://houseofpetalss.netlify.app/))

---

## Tech Stack

- **Frontend**: HTML5, Stylus CSS, JavaScript (ES6+), Three.js (WebGPU / WebGL), Rapier Physics.
- **AI Agent**: Groq API (`openai/gpt-oss-20b`), Server-Sent Events (SSE) streaming, local-first RAG fallback engine.
- **Tooling & Build**: Vite v7, Node.js, GLTF Transform.

---

## Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SaiVinoth17/sai-vinoth-portfolio.git
   cd sai-vinoth-portfolio
   ```

2. **Environment Configuration**:
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Add your Groq API key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   LLM_MODEL=openai/gpt-oss-20b
   ```

3. **Install Dependencies & Run**:
   ```bash
   npm install --force
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   ```

---

## License & Credits

Copyright © 2026 Sai Vinoth. All rights reserved.