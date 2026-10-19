# Roadmap / to-do

Done so far: the 7 core tools, Repurpose (tool 8), Free copy-prompt mode, Auto mode with live research, creator profile, performance notes, refine, tool-to-tool handoff, library with Markdown/CSV export.

## Phase 1: ready for paying users

- [ ] **Accounts and login.** Email or Google sign-in so each user's data is private and nobody can spend the API credits without an account. (Supabase Auth is the likely pick.)
- [ ] **Database storage.** Move profile, notes and library out of browser storage so they sync across devices and survive clearing the browser. (Supabase Postgres.)
- [ ] **Client workspaces.** One profile, notes and library per brand, switchable in one click. For agencies and freelancers managing several accounts.
- [ ] **Usage tracking and limits.** Show the cost of each run (from the API's token usage and search count) and enforce monthly caps per user or plan.
- [ ] **Billing.** Stripe subscriptions, e.g. Free (copy-prompt mode), Creator, Agency.
- [ ] **Hosting.** Deploy to Render or Railway once login exists. Never deploy publicly without login.
- [ ] **Cheaper default model option.** Let users pick quality vs cost per run (Opus / Sonnet / Haiku), with an estimate shown before running.

## Phase 2: features that beat a ChatGPT template

- [ ] **Speech to text (transcription).** Upload a video or audio file (mp4, mov, mp3, m4a, wav) and get a timestamped transcript automatically. Today Repurpose needs a pasted transcript, a caption file (.srt/.vtt/.txt) or an article link.
  - [ ] Pick a service: a hosted speech-to-text API (e.g. Deepgram, AssemblyAI, OpenAI Whisper API) for speed, or local Whisper (whisper.cpp) on the laptop for free but slower. Compare accuracy, price per hour of audio, and speaker labels.
  - [ ] Upload flow: file picker with a progress bar, a size/length limit, and the audio extracted from video before sending (smaller and cheaper).
  - [ ] Output word-level timestamps and speaker names, saved as a transcript and as .srt captions you can download.
  - [ ] Feed the transcript straight into Repurpose so clip ideas come with exact cut points.
  - [ ] Also use it in Video Scripts ("transcribe my draft take and tighten it") and Captions (caption a finished video).
  - [ ] Add transcription minutes to usage tracking and plan limits.
  - [ ] Free mode fallback: local Whisper, or instructions for exporting captions from CapCut / YouTube / TikTok.
- [ ] **Repurpose: video service hookup.** Send a finished video from the video service straight into Repurpose.
- [ ] **Weekly trend radar.** A scheduled job researches each client's niche every Monday and sends a digest: what's trending, what competitors posted, 5 ideas.
- [ ] **Competitor tracker.** Add 3–5 accounts and get reports on what's working for them and what gaps to fill. Use web research and Meta's Business Discovery API. No scraping.
- [ ] **Client-ready reports and approvals.** Branded PDF export of calendars and plans, and a share link where a client can approve or comment on each post.
- [ ] **Brand kit.** Logo, colors, fonts and example posts per client, fed into the design and caption tools.

## Phase 3: close the loop

- [ ] **Connect real accounts for analytics.** Pull post stats from TikTok, Instagram and YouTube through their official APIs so performance notes fill themselves in. Apply for platform app review early because approval takes weeks.
- [ ] **Publish and schedule.** Official APIs only (Instagram Graph API Content Publishing, TikTok Content Posting API, YouTube Data API), or hand off to Buffer/Later first. Business/Creator accounts only on Instagram. No password logins, no unofficial APIs, no auto-likes/follows/comments.
- [ ] **Engagement Boost: post replies.** Optional posting of approved replies through official APIs, always with a human approving.
