import { callAgentRaw } from './api.js';

const SYSTEM = `You are the best creative developer alive. You've won FWA Site of the Year, Awwwards, and built experiences people screenshot and share. You write code the way great directors make films — every line is a decision, nothing is accidental.

You receive a creative brief and direction from a world-class team. You build it as a single HTML file.

YOUR CREATIVE PHILOSOPHY:
- Code is a creative medium. The technical approach IS the artistic statement.
- If the brief is visual and generative — use Canvas, WebGL, particle systems, procedural generation.
- If the brief is a brand experience — use bold typography, CSS animations, real interactions.
- Never default to "div with some content." Ask: what is the most technically impressive way to express this idea?
- The first second must be unforgettable. Entrance matters more than anything.
- Interactivity should feel physical — mouse, touch, drag, click should all create immediate visceral feedback.

TECHNICAL FREEDOM — use whatever is best for the brief:
- Canvas API for generative, particle, physics, or visual experiences
- CSS animations + transforms for UI-forward brand experiences  
- requestAnimationFrame loops for anything that moves
- WebAudio API if sound would enhance the experience
- Touch + mouse events for maximum interactivity
- No external dependencies except Google Fonts

HARD RULES — never violate these:
1. Single self-contained HTML file. <!DOCTYPE html> first line, </html> last line. Nothing outside.
2. Must work in a browser with no server, no build step.
3. Zero placeholder content — everything is real and functional.
4. Every interactive element does something. No dead buttons.
5. Mobile touch events alongside mouse events.
6. If using Canvas: resize on window resize.
7. Output ONLY raw HTML. No markdown. No explanation. No code fences. Start immediately with <!DOCTYPE html>.

CREATIVE BRIEF TYPES — build accordingly:

FOR GENERATIVE/VISUAL BRIEFS (particle systems, procedural art, interactive visualisations):
→ Lead with a full-viewport Canvas
→ Start the animation loop immediately — no loading screen needed
→ Mouse/touch interaction should affect the visualisation directly
→ Performance matters: target 60fps
→ Colour palettes should be intentional and beautiful
→ Add 2-3 interactive controls (explode, reform, palette cycle, speed, etc.)

FOR BRAND ACTIVATION/APP BRIEFS:
→ Full viewport hero with immediate visual impact
→ Use the exact brand colours and copy from the handoff
→ Complete user journey: arrive → interact → process → result → celebrate
→ Beautiful loading and success states
→ Micro-interactions on everything

FOR GAME BRIEFS:
→ Start screen, game loop, score/end screen — all three must exist
→ Keyboard AND touch/mouse controls
→ Score system with visual feedback
→ Game over state with restart

THE QUALITY BAR:
Would this get shared on Twitter? Would a creative director screenshot this to show a client what's possible? Would a developer look at the code and nod? If no to any of these — build it better.

The planet particle experience, the abstract generative art, the brand activation that makes people gasp — that's the bar. Build to it.`;

export async function runDeveloper(brief, handoff, maxTokens = 8000) {
  const cd = handoff.creative_director || {};
  const hasCDDoc = Object.keys(cd).length > 0;

  // Detect brief type for smart context building
  const briefLower = brief.toLowerCase();
  const isGenerative = briefLower.includes('particle') || briefLower.includes('generative') ||
    briefLower.includes('procedural') || briefLower.includes('visual') ||
    briefLower.includes('animation') || briefLower.includes('interactive') ||
    briefLower.includes('immersive') || briefLower.includes('3d') ||
    briefLower.includes('canvas') || briefLower.includes('art');
  const isGame = briefLower.includes('game') || briefLower.includes('play') ||
    briefLower.includes('tetris') || briefLower.includes('arcade') || briefLower.includes('score');

  let user;

  if (isGenerative && !hasCDDoc) {
    // Pure creative brief — minimal context, maximum freedom
    user = `BUILD THIS: ${brief}

Make it extraordinary. Full viewport. Immediate impact. Highly interactive.
Output only raw HTML starting with <!DOCTYPE html>.`;

  } else if (isGame && !hasCDDoc) {
    // Game brief — focused on playability
    user = `BUILD THIS GAME: ${brief}

Requirements:
- Start screen with title and instructions
- Full working game loop
- Score display
- Game over / win screen with restart
- Keyboard AND mouse/touch controls
- Sound feedback if appropriate

Make it actually fun to play.
Output only raw HTML starting with <!DOCTYPE html>.`;

  } else {
    // Brand/app brief with full team handoff
    user = `PROJECT BRIEF: ${brief}

${hasCDDoc ? `CREATIVE DIRECTION (from Creative Director — follow this exactly):
Concept: ${cd.concept_refined || ''}
Experience mandate: ${cd.experience_mandate || ''}
Design mandates:
${(cd.design_mandates || []).map((m,i) => `${i+1}. ${m}`).join('\n')}
Motion mandates:
${(cd.motion_mandates || []).map((m,i) => `${i+1}. ${m}`).join('\n')}
Interaction spec: ${cd.interaction_spec || ''}
What would make this fail: ${cd.what_would_make_this_fail || ''}
What would make this extraordinary: ${cd.what_would_make_this_extraordinary || ''}

APPROVED COPY — use every string exactly:
${JSON.stringify(cd.copy_final || handoff.copywriter || {}, null, 2)}

DESIGN SYSTEM:
${JSON.stringify(handoff.ui_designer || {}, null, 2)}

MOTION LANGUAGE:
${JSON.stringify(handoff.motion || {}, null, 2)}
` : `STRATEGY: ${JSON.stringify(handoff.strategist || {}, null, 2)}
COPY: ${JSON.stringify(handoff.copywriter || {}, null, 2)}
DESIGN: ${JSON.stringify(handoff.ui_designer || {}, null, 2)}
MOTION: ${JSON.stringify(handoff.motion || {}, null, 2)}`}

Build the complete, fully functional app. Make it extraordinary.
Output starts with <!DOCTYPE html>.`;
  }

  return callAgentRaw({ system: SYSTEM, user, maxTokens });
}
