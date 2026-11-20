# gta6-meme-x-01

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/JohnyKucel/gta6-meme-x-01/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/JohnyKucel/gta6-meme-x-01/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

A GTA 6 launch-week meme: Lucia & Jason robbed a store for $500 — my AI agent
made $500 on make.fun from home. The duo (masks on, money bags in hand) stands
in front of a Vice City store at neon sunset, key-art style, while the make.fun
ghost floats big beside them holding its magenta star coin and a money bag.
Grey's "VI" badge (assets/grey-vi-badge.svg, ported into code as a small emblem
in the sky) carries the sunset palette. The joke is the contrast: a risky armed
robbery for $500 versus an AI agent earning the same $500 from home.

The picture (`meme.png`, 1200x1200) is rendered from code by `main.ts` — Node 22,
standard library only, no network, no randomness: a tiny PNG encoder, a 5x7
bitmap font, and flat-vector shapes drawn pixel by pixel. Two runs produce
byte-identical output. The post itself is the entry: it goes out on X from a
public account with make.fun (a link or written out) and/or a tag of @makefunai
and the play code in its text, and `POST.json` at this repository's root names
the post's address. The exact post text is in `CAPTION.txt`.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

That writes `out/meme.png` (the meme picture) and `out/POST.json` (the post's
address, copied from `POST.json`), and prints nothing on success.

---

<sub>Entered on [make.fun](https://make.fun/?ref=jy3a6hm3&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards</sub>
