# Content Studio

Eight tools for planning, writing and posting social content. Every run does live web research first (current trends, platform changes, active hashtags, recent posting-time studies, facts on your topic), then writes the deliverable.

Two ways to run it:

- **Free mode (no API key).** The app builds the full prompt (your profile, performance notes, research instructions and output format). You copy it into a free claude.ai chat with web search turned on, then paste the answer back to save, export, refine or hand off to the next tool.
- **Auto mode (API key).** The app does the research and writing itself, shows each search and every source it checked, and streams the result in.

Switch between them at the bottom of the sidebar. Auto unlocks once an API key is set.

| # | Tool | What you get |
|---|------|--------------|
| 1 | Content Calendar | 30-day plan mixing videos, carousels and captions, built around the holidays and moments that fall inside those 30 days |
| 2 | Viral Hooks | 20+ hooks grouped by type, with overlay text and your top 3 to test first |
| 3 | Designing Prompts | Canva-ready designs: sizes, template search terms, overlay text per slide, fonts, hex colors |
| 4 | Video Scripts | Timed scripts (shot / on-screen text / spoken line), audio ideas, retention notes |
| 5 | Captions + Hashtags | Storytelling captions with a CTA, plus 5–7 hashtags checked to be active right now |
| 6 | Engagement Boost | Comment replies grouped by comment type. Paste real comments to get replies to those |
| 7 | Scheduling Time | Weekly schedule for your time zone, based on recent cited studies, plus a 2-week test plan |
| 8 | Repurpose | One transcript, script, caption file (.srt/.vtt/.txt) or article link turned into clip ideas with timestamps, hooks, captions per platform, a carousel, threads, LinkedIn, YouTube copy and a 7-day posting order |

## How it gets better as you use it

- **Creator profile**: fill it in once (niche, audience, voice, goals, what to avoid). Every tool uses it.
- **Performance notes**: log what worked and what flopped. Your 25 most recent notes go into every request, so the advice changes based on your own results.
- **Refine**: ask for changes on any result ("punchier", "make day 12 a collab", "rewrite for LinkedIn").
- **Keep the flow going**: one click takes a result into the next tool (calendar → hooks → scripts → captions).
- **Library**: save results, search them, download as Markdown, or export a calendar or script table as CSV.

## Run it

Requires Node 22+. An Anthropic API key is optional (only needed for Auto mode).

```bash
npm install
npm start              # http://localhost:3000, Free mode
```

To turn on Auto mode:

```bash
cp .env.example .env   # paste your ANTHROPIC_API_KEY into .env
npm start
```

Optional settings in `.env`: `PORT`, `CONTENT_MODEL` (default `claude-opus-5-5`), `CONTENT_EFFORT` (`low` to `max`, default `high`; lower is faster and cheaper, higher researches more thoroughly).

## How it works

- `server.js` streams each run from the Claude API with the web search and web fetch tools turned on (up to 10 searches and 5 page reads per run). Searches, sources and text stream to the browser as server-sent events. Long research runs that pause are resumed automatically. Server-side refusal fallback (`fallbacks: "default"`) is on.
- `src/tools.js` defines the eight tools: their form fields and the task prompt for each. Add or change a tool here.
- `src/prompts.js` holds the shared research-first system prompt and builds the profile and notes context.
- `public/` is the plain HTML/CSS/JS front end. Model output is sanitized before it's displayed.

## Notes

- Your profile, notes and library live in your browser's local storage. Use **Library → Export workspace** to back them up or move them to another browser.
- There's no login. Don't expose the server publicly as is, because anyone who can reach it can spend your API credits. To build this into a video service, `POST /api/generate` is the endpoint to call. Put your own auth in front of it.
- Auto mode cost per run (estimates, not measured): about $0.35–$0.95 on the default `claude-opus-5-5` at high effort, about $0.15–$0.45 with `CONTENT_MODEL=claude-sonnet-5-5`, and about $0.05–$0.12 with `claude-haiku-5-5` and `CONTENT_EFFORT=low`. Searches are about 1¢ each. Set a monthly spend limit in the Anthropic console. Runs take about 1–3 minutes.
- Free mode costs nothing. Free claude.ai accounts have usage limits.
- See [ROADMAP.md](ROADMAP.md) for what's planned next.
