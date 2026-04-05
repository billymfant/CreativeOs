import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { runEstimator }         from './agents/estimator.js';
import { runStrategist }        from './agents/strategist.js';
import { runCopywriter }        from './agents/copywriter.js';
import { runUIDesigner }        from './agents/ui-designer.js';
import { runMotion }            from './agents/motion.js';
import { runCreativeDirector }  from './agents/creative-director.js';
import { runDeveloper }         from './agents/developer.js';
import { runQA }                from './agents/qa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(path.join(__dirname, 'outputs')));

// ─────────────────────────────────────────
// POST /estimate — pre-flight cost estimate
// ─────────────────────────────────────────
app.post('/estimate', async (req, res) => {
  const { brief } = req.body;
  if (!brief || brief.trim().length < 5) {
    return res.status(400).json({ error: 'Brief too short.' });
  }
  try {
    const estimate = await runEstimator(brief);
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /run — full 7-agent pipeline
// ─────────────────────────────────────────
app.post('/run', async (req, res) => {
  const { brief, client, token_budget } = req.body;

  if (!brief || brief.trim().length < 10) {
    return res.status(400).json({ error: 'Brief is too short.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Determine token budget — user can override via token_budget param
  const devTokens = token_budget || 8000;

  try {
    let clientConfig = {};
    if (client) {
      try {
        const configPath = path.join(__dirname, 'configs', `${client}.json`);
        clientConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        send('status', { msg: `Client config loaded: ${client}` });
      } catch {
        send('status', { msg: `No config for "${client}" — running generic.` });
      }
    }

    const handoff = { brief, client: clientConfig };

    // ── 1: Strategist ──
    send('agent', { id: 'strategist', state: 'active', label: 'Finding the human truth…' });
    handoff.strategist = await runStrategist(brief, clientConfig);
    send('agent', { id: 'strategist', state: 'done', output: handoff.strategist });

    // ── 2: Copywriter ──
    send('agent', { id: 'copywriter', state: 'active', label: 'Writing every word…' });
    handoff.copywriter = await runCopywriter(brief, handoff.strategist, clientConfig);
    send('agent', { id: 'copywriter', state: 'done', output: handoff.copywriter });

    // ── 3: UI Designer ──
    send('agent', { id: 'ui_designer', state: 'active', label: 'Designing the visual system…' });
    handoff.ui_designer = await runUIDesigner(brief, handoff.strategist, handoff.copywriter, clientConfig);
    send('agent', { id: 'ui_designer', state: 'done', output: handoff.ui_designer });

    // ── 4: Motion Director ──
    send('agent', { id: 'motion', state: 'active', label: 'Defining the motion language…' });
    handoff.motion = await runMotion(brief, handoff, clientConfig);
    send('agent', { id: 'motion', state: 'done', output: handoff.motion });

    // ── 5: Creative Director ──
    send('agent', { id: 'creative_director', state: 'active', label: 'Creative Director reviewing…' });
    handoff.creative_director = await runCreativeDirector(brief, handoff);
    send('agent', { id: 'creative_director', state: 'done', output: handoff.creative_director });

    // ── 6: Developer ──
    send('agent', { id: 'developer', state: 'active', label: 'Building the app…' });
    send('status', { msg: `Developer writing code (budget: ${devTokens} tokens)…` });

    let html;
    try {
      html = await runDeveloper(brief, handoff, devTokens);
    } catch (devErr) {
      // Token limit hit — ask frontend if user wants to retry with more
      if (devErr.message.includes('token limit')) {
        send('budget_exceeded', {
          agent: 'developer',
          current_budget: devTokens,
          suggested_budget: Math.min(devTokens + 4000, 16000),
          message: devErr.message,
          handoff_snapshot: handoff
        });
        res.end();
        return;
      }
      throw devErr;
    }

    send('agent', { id: 'developer', state: 'done' });

    // ── 7: QA ──
    send('agent', { id: 'qa', state: 'active', label: 'QA reviewing and fixing…' });
    send('status', { msg: 'QA agent running three-pass audit…' });

    let finalHtml;
    try {
      finalHtml = await runQA(brief, html, handoff, devTokens);
    } catch (qaErr) {
      if (qaErr.message.includes('token limit')) {
        // QA failed but we still have the developer output — save it as-is
        send('status', { msg: 'QA hit token limit — saving developer output directly.' });
        finalHtml = html;
      } else {
        throw qaErr;
      }
    }

    send('agent', { id: 'qa', state: 'done' });

    // ── Save ──
    const jobId = uuid();
    await fs.mkdir(path.join(__dirname, 'outputs'), { recursive: true });
    await fs.writeFile(path.join(__dirname, 'outputs', `${jobId}.html`), finalHtml, 'utf-8');
    await fs.writeFile(path.join(__dirname, 'outputs', `${jobId}.json`), JSON.stringify({
      id: jobId, brief, client: client || null, handoff,
      token_budget: devTokens,
      createdAt: new Date().toISOString()
    }, null, 2));

    send('done', { jobId, url: `/output/${jobId}.html` });

  } catch (err) {
    console.error('Pipeline error:', err);
    send('error', { message: err.message });
  }

  res.end();
});

// GET /jobs
app.get('/jobs', async (req, res) => {
  try {
    const files = await fs.readdir(path.join(__dirname, 'outputs'));
    const jobs = await Promise.all(
      files.filter(f => f.endsWith('.json')).map(async f => {
        const j = JSON.parse(await fs.readFile(path.join(__dirname, 'outputs', f), 'utf-8'));
        return { id: j.id, brief: j.brief, client: j.client, createdAt: j.createdAt, url: `/output/${j.id}.html` };
      })
    );
    res.json(jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch { res.json([]); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CreativeOS running → http://localhost:${PORT}`));
