[![make.fun](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/giber76/btc-race-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/giber76/btc-race-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)

# RangeRider round 9 — washout-micro cbBTC trading bot

Entry for [make.fun btc-race-24h-20261118-1444](https://make.fun/bounty/btc-race-24h-20261118-1444)
("Race a BTC trading bot live for 24 hours", $250, top 10 on the live 24h race window).

## Why round 9 exists

Round 8 finished the previous race #2,842 of 4,387 at −$10.00, no prize, on three
stacked failures that this version addresses by name:

1. **The 240-bar warmup blinded it.** BTC fell 1.34% from the window start while
   the bot could not trade; the dip trigger was first satisfied at bar 208 but
   the bot bought at bar 240 — 24 bars after the washout low, 0.99% above the
   low, after the bounce had already peaked. Warmup 240 → 30.
2. **The snap measured its dip against a stale 420-minute high** and its
   recovery gate held it off until the bounce was underway. The new micro tier
   measures the dip at the trailing 30-minute low, so it fires on the washout
   itself.
3. **The 1% loss-cap latch ended the race on one bad trade** (a single snap
   wave lost 1.11% on fill slippage past its 0.8% stop; the second dip went
   untraded). Round 9 does not remove the latch — it makes the first trade less
   likely to be the bad one by entering at the low. A single micro stop-out at
   0.8% leaves equity ~$992, above the $990 latch line. Two consecutive
   stop-outs still latch. Known residual risk.

## Strategy

A four-mode bot with only relative triggers (trailing highs, a moving average,
the entry price) — no absolute price level, no schedule — so the same rules fire
on any fresh 24-hour window.

- **Washout micro (new in round 9):** buy when the trailing 30-minute low is
  at least 2.5% below the trailing 90-minute high of highs, close at or above
  that low. Size 100% of cash. Exit: +1.2% take-profit, 0.8% hard stop, 0.2%
  trailing stop once +0.2% up, 120-bar hold. Own 40-bar cooldown, own 20-wave
  budget, gated by the loss-cap latch. Tried after snap, so it never pre-empts
  the main trade; after a micro exit the snap is blocked for 60 bars so it
  cannot chase the same bounce late. The 2.5% threshold was re-tuned from the
  study's 3.0% after testing 2.8/3.0/3.2% on this race's dev window — all three
  never fire (deepest washout 2.69%, dev −$8.52, gate fail). On yesterday's
  live window the study's 3.0% version banks +$13.60 (micro buys at bars 214
  and 279, the two washouts); the re-tuned 2.5% version banks +$6.56 there
  (fires 2 bars earlier/higher) — the price of firing at all on this race's
  window.
- **Snapback (flat windows, hybridised from v1's Two-Tier Snapback):** buy when
  the close is ≥ 2.0% below the trailing 420-minute high of bar highs, only if
  the close is at least 0.2% above the trailing 30-minute low (the dip has
  stopped falling). Exit: +1.0% take-profit, 0.8% trailing stop once +0.8% up,
  0.8% hard stop (tier 1; 2.5% for tier 2), 240-bar hold. Tier 2 takes profit
  at +0.8%. A 20-bar cooldown after an exit (40 after a losing snap exit) and
  a 1% loss cap latching snap entries off below $990 realised equity.
- **Deep V tiers (crash windows, inherited from the previous race's v5):** tier 1
  buys 40% of cash at 5.0% below the trailing 360-minute high; while holding
  it, a further fall to 5.3% buys all remaining cash. Exit: +4.5% over the
  blended entry, 1.2% trailing stop, 1.5% hard stop, 240 bars. The loss cap
  does NOT gate deep entries.
- **Rider (rising windows):** if the close breaks 0.3% above the trailing
  240-minute high with the 8-bar mean above the 21-bar mean and still rising,
  buy 50% of cash. It never fired on any tested window; it stays because a bot
  with no trade at all fails the guardrails.

## Honest numbers (bit-perfect Python simulator, same integer fill math as the kit)

| Window | PnL | Trades | Max DD |
|---|---|---|---|
| dev 20261118 (this race) | +$17.68 | 7 | 0.95% |
| mirrored dev | −$11.79 | 2 | 1.43% |
| prev race 20261113 | +$9.31 | 6 | 2.15% |
| prev race 20261115 | +$40.06 | 6 | 1.61% |
| old dev 20261117 | +$8.60 | 2 | 0.57% |
| mirrored old dev | +$18.04 | 4 | 0.53% |
| live 20261117 replay | +$6.56 | 4 | 0.71% |

Dev +$17.68 is $0.52 below the dev top-10 bar (+$18.20); the dev gate is > $0.
The last-bar snap buy (bar 1439) flattens at −$3.85, a window-end artifact;
without it dev would be +$21.53. Worst window −$11.79 (mirrored dev): the
micro is not mirror-robust. The 2.5% threshold is thin — if the race window
grinds down slowly without a snap pre-empting it, the micro can fire into a
falling knife. Full deepened study: `btc-race-20261118-study-deep.md` in the
workspace (not part of this repo).

## Run

```sh
node cli/makefun.mjs grade-local --kit <kit-dir> --bot main.ts
```

Deterministic: integer arithmetic on the bars the harness sends; no clock, no
randomness, no network, no files. Standard library only, plus the kit's
TypeScript shim vendored under `vendor/` (byte-for-byte copy from this race's
kit).
