# CreativeOS

AI creative team — independent agents, deployable outputs.

## Project structure

```
creativeos/
├── server.js          ← Express server, SSE pipeline, file serving
├── agents/
│   ├── api.js         ← Shared Anthropic API caller
│   ├── strategist.js  ← Agent 1: brand strategy
│   ├── copywriter.js  ← Agent 2: copy and naming
│   ├── ui-designer.js ← Agent 3: visual design system
│   ├── motion.js      ← Agent 4: animation direction
│   └── developer.js   ← Agent 5: builds the HTML app
├── configs/
│   └── coca-cola.json ← Example client brand config
├── outputs/           ← Generated apps saved here (git ignored)
├── public/
│   └── index.html     ← Frontend UI
├── .env.example       ← Copy to .env and add your API key
├── railway.json       ← Railway deployment config
└── package.json
```

---

## Run locally

**Step 1 — Install dependencies**
```bash
cd creativeos
npm install
```

**Step 2 — Add your Anthropic API key**
```bash
cp .env.example .env
```
Open `.env` and replace `your_api_key_here` with your real key from console.anthropic.com

**Step 3 — Start the server**
```bash
npm run dev
```

**Step 4 — Open in browser**
```
http://localhost:3000
```

Type a brief, hit Run. Each agent fires independently. The output saves as a real HTML file and appears in the preview with a local URL.

---

## Deploy to Railway (live URL)

**Step 1 — Push to GitHub**
```bash
git init
git add .
git commit -m "initial creativeos"
git remote add origin https://github.com/YOUR_USERNAME/creativeos.git
git push -u origin main
```

**Step 2 — Create Railway project**
- Go to railway.app
- Click "New Project" → "Deploy from GitHub repo"
- Select your creativeos repo
- Railway auto-detects Node.js and deploys

**Step 3 — Add environment variable**
- In Railway dashboard → your project → Variables
- Add: `ANTHROPIC_API_KEY` = your key
- Railway redeploys automatically

**Step 4 — Get your URL**
- Railway dashboard → Settings → Networking → Generate Domain
- Your app is live at `https://creativeos-xxxx.railway.app`

---

## Add a client config

Create `configs/your-client.json`:
```json
{
  "name": "Client Name",
  "voice": "Describe their brand voice here",
  "colors": {
    "primary": "#FF0000",
    "secondary": "#000000",
    "accent": "#FFFFFF"
  },
  "rules": [
    "Any brand rules agents should follow"
  ]
}
```

Then in the brief input, type the client name (e.g. `coca-cola`) in the client field.
The Strategist and UI Designer will automatically load and apply the config.

---

## Customise an agent

Open any file in `agents/` and edit the `SYSTEM` constant at the top.
That string is the agent's entire personality and instructions.
Each agent is independent — changing one doesn't affect the others.

Restart the server (`npm run dev` does this automatically) and run a new brief.
