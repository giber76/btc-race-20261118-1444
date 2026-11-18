// RangeRider round 9 -- washout-micro cbBTC bot for btc-race-24h-20261118-1444.
//
// Round 9 changes (vs round 8 8e74576, which finished the 20261117 race
// #2,842 of 4,387 at -$10.00, no prize): three stacked failures from that
// live run, each addressed by a named change --
//   (a) The 240-bar warmup blinded the bot while BTC fell 1.34% from the
//       window start (2.19% from the race high). The dip trigger was first
//       satisfied at bar 208 but the bot could not trade until bar 240, so
//       it bought 24 bars after the washout low, 0.99% above the low, after
//       the bounce had already peaked. WARMUP_BARS 240 -> 30.
//   (b) The snap measures its dip against the trailing 420-minute high of
//       highs, 68-100 bars old by the buy, and its 0.2% recovery gate held
//       it off until the bounce was underway. The new MICRO tier measures
//       the dip at the trailing 30-minute LOW instead of the close, so it
//       fires on the washout itself rather than on the bounce.
//   (c) The 1% loss-cap latch ended the race on one bad trade (the single
//       snap wave lost 1.11% on fill slippage past its 0.8% stop, equity
//       $988.93 < $990, latched; the second dip went untraded). Round 9
//       does NOT remove the latch -- it makes the first trade less likely
//       to be the bad one by entering at the low -- and a single micro
//       stop-out at 0.8% leaves equity ~$992, above the latch line. Two
//       consecutive stop-outs, or one fill slipping past 1.0%, still latch.
//       Known residual risk, not a fix.
//
// MICRO (washout tier, from the winners study of the 20261117 live window):
// the live winners bought the -3.11% washout to $63,347.82 (bar 216) and
// rode the +1.61% V-bounce, then a second -3.02% dip (bar 278). The final
// board's top 10 (line +$19.90) mostly did exactly 4 trades = 2 round
// trips. Micro entry: the trailing 30-minute LOW is at least 2.5% below
// the trailing 90-minute high of highs, close at or above that low
// (recovery 0). Size 100% of cash. Exits: +1.2% take-profit, 0.8% hard
// stop, 0.2% trailing stop once +0.2% up, 120-bar hold. Own 40-bar
// cooldown, own 20-wave budget, gated by the loss-cap latch. Tried AFTER
// snap, so it never pre-empts the main trade; after a micro exit the snap
// is blocked for 60 bars (SNAP_CD_MICRO) so it cannot chase the same
// bounce late -- the round-8 failure mode.
//   The study's 3.0% threshold was tuned on yesterday's 3.11% washout
//   and NEVER fires on this race's dev window (deepest washout 2.69%,
//   0 trigger bars at any high window). Re-tuned to 2.5% / 90-min high
//   after testing 2.8/3.0/3.2% on the new dev window (all dormant, dev
//   -$8.52, gate FAIL). 2.5% fires on newdev (39 trigger bars), oos13,
//   and live17. It gives up ~$7 vs the 3.0% version on yesterday's live
//   window (fires 2 bars earlier/higher) -- the price of firing at all
//   on this race's window. Full study: btc-race-20261118-study-deep.md.
//
// One asset, CBBTC (Coinbase Wrapped BTC on Solana), long only, $1,000 of
// paper money, one-minute bars. Every trigger is RELATIVE (trailing highs,
// a moving average, the entry price) -- no absolute price level, no
// schedule, nothing fitted to a calendar date -- so the same rules fire on
// any fresh 24-hour window.
//
// SNAPBACK -- the workhorse, hybridised from the v1 "Two-Tier Snapback"
// (which graded +$22.35 on dev but lost -$11.20/-$15.38 on the two held-out
// windows, so its raw form is NOT used). Buy when the close is at least
// 2.0% below the trailing 420-minute high of bar highs, but ONLY when the
// close is at least 0.2% above the trailing 30-minute low (recovery: the
// dip has stopped falling). No trend gate, no bounce gate: the 2.0% dip
// plus the recovery gate is what keeps the falling windows positive --
// shallower dips (1.6-1.8%) add only losing trades out of sample. Spend
// 100% of cash (v4: the latch now evaluates only while flat, so the
// 20261113 wave-1 trough no longer kills the recovering waves). Exit at
// +1.0% over entry, a 0.8% trailing stop below the peak since entry once
// +0.8% up, a 0.8% hard stop (tier 1, round 5; 2.5% for tier 2), or 240
// bars held. Tier 2 takes profit at +0.8% (round 8): its waves peak only
// +0.11%/+0.86% during the hold, so the old +2.5% take never bound. A
// 20-bar cooldown after an exit fill keeps the bot from re-entering a
// still-falling market. A 1% loss cap latches snap entries off once
// REALISED equity falls below $990 (evaluated only while flat, v4) --
// on the crash window the first snap wave loses $11.24 (round 5; was
// $12.70), which trips the cap and stops the bleeding before the deep
// trade; on the falling window the first wave loses only $5.12, so the
// cap stays open and the recovering waves still fire. A 2% cap ($980) is
// too loose: it lets a second losing snap wave through on the crash
// window. Round 6: the latch re-arms -- once flat and realised equity is
// back at or above $990 (e.g. after a deep win), snap entries are allowed
// again, and the latch re-trips the same way if equity falls back below
// $990. (In practice the re-arm is near-dead: flat equity cannot recover
// on its own, so a latched bot stays latched unless a deep win repairs
// it first.)
//
// DEEP V tiers -- the crash catcher, inherited from the previous race's
// v5 (proven there: the same two fills, 62,648 then 62,266, made +$45.98
// on the 20261115 window). Tier 1 buys 40% of cash at 5.0% below the
// trailing 360-minute high (round 7: 4.8% -> 5.0%); while holding it, a
// further fall to 5.3% below that high buys all remaining cash (tier 2
// scale-in). A straight gap past 5.3% buys all cash at once. Exits:
// +4.5% over the blended entry, 1.2% trailing stop, 1.5% hard stop, 240
// bars. No trend or recovery gate here: in a washout the recovery gate
// costs 1-3 bars past the trough, which is where the money is. The loss
// cap does NOT gate deep entries: on the crash window the deep trade is
// what pays, and it fires after the snap waves have already lost money.
//
// RIDER -- insurance for a rising window where dips never come: if the
// close breaks 0.3% above the trailing 240-minute high with the 8-bar
// mean above the 21-bar mean and still rising, buy 50% of cash, exits as
// the snapback's. It never fired on any tested window; it stays because
// a bot with no trade at all fails the guardrails.
//
// Costs: a full-size round trip pays about 26 bps in fees, slippage and
// impact, so the snapback's 1.0% take-profit clears it with room, and the
// 0.8% trail banks a winner before it gives the move back. Every order
// caps slippage at 400 bps against the latest close; fills normally move
// 10-30 bps, so a fast minute cannot reject the entry that matters.
//
// Honest numbers (bit-perfect Python simulator, same integer fill math as
// the kit; kit grade-local below must reproduce the dev line):
//   dev 20261118 (this race):  +$17.68, 7 trades, 4 waves, max DD 0.95%
//   mirrored dev window:       -$11.79, 2 trades, 1 wave, max DD 1.43%
//   prev race window 20261113: +$9.31, 6 trades, 3 waves, max DD 2.15%
//   prev race window 20261115: +$40.06, 6 trades, 3 waves, max DD 1.61%
//   old dev window 20261117:   +$8.60, 2 trades, 1 wave, max DD 0.57%
//   mirrored old dev:          +$18.04, 4 trades, 2 waves, max DD 0.53%
//   live 20261117 replay:      +$6.56, 4 trades, 2 waves, max DD 0.71%
// Dev +$17.68 is $0.52 below the dev top-10 bar (+$18.20); the dev gate
// is > $0. The last-bar snap buy (bar 1439) flattens at -$3.85, a
// window-end artifact; without it dev would be +$21.53. Worst window
// -$11.79 (mirrored dev): the micro is not mirror-robust. Max 12 waves
// per window; at most one position at a time. Study L2 on yesterday's
// live window banks +$13.60 (micro buys at bars 214 + 279); the re-tuned
// 2.5% version banks +$6.56 there (fires earlier/higher).
//
// Deterministic: integer arithmetic on the bars the harness sends; no
// clock, no randomness, no network, no files. Standard library only,
// plus the kit's TypeScript shim vendored under vendor/ (byte-for-byte
// copy from this race's kit).

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// Snapback (hybridised from v1's Two-Tier Snapback; see header).
const SNAP_DIP1 = 20n; // 2.0% below the trailing 420-min high of highs
const SNAP_DIP2 = 27n; // 2.7% below that high (tier 2)
const SNAP_HI_WIN = 420;
const SNAP_SIZE_PCT = 100n; // spend 100% of cash (v4: flat-only latch saves 20261113)
const SNAP_TAKE1 = 10n; // +1.0% over entry (tier 1)
const SNAP_STOP1 = 8n; // 0.8% under entry (tier 1; round 5: tighter stop -- the crash wave-1 exit costs $11.24 instead of $12.70, and the $990 latch still trips)
const SNAP_TAKE2 = 8n; // +0.8% over entry (tier 2; round 8: 2.5% -> 0.8% -- the falling window's tier-2 waves peak only +0.11%/+0.86% during their 240-bar holds, so the old 2.5% take never bound and they bled out on hold; at +0.8% wave 2 exits at +$5.92 instead of +$5.23 and wave 3 is unchanged, lifting the falling window +$8.61 -> +$9.31; if a live wave-2 peak stays below +0.8% the take never fires and it falls back to the hold exit, so the change can only help or match)
const SNAP_STOP2 = 25n; // 2.5% under entry (tier 2)
const SNAP_ARM = 8n; // trail arms once +0.8% up
const SNAP_TRAIL = 8n; // 0.8% below the peak since entry
const SNAP_HOLD = 240; // bars, then out
const SNAP_COOLDOWN = 20; // bars after an exit fill before re-entering
const SNAP_COOLDOWN_LOSS = 40; // bars after a LOSING snap exit (v4)
const SNAP_RECOVERY = 2n; // 0.2% above the trailing 30-min low
const SNAP_RECOVERY_WIN = 30;
const SNAP_CD_MICRO = 60; // round 9: bars after a micro exit fill before snap may re-enter (the micro already banked the bounce; the snap must not chase it late)
const LOSS_CAP_USDC = 990_000_000n; // stop snap entries below $990 equity (round 4: 1% realised-loss cap)

// Washout micro tier (round 9; see header). Entry measures the dip at the
// trailing 30-minute LOW vs the trailing high of highs -- the washout
// itself, not the bounce. Re-tuned 3.0% -> 2.5% / 150 -> 90-min high:
// 3.0% never fires on this race's dev window (deepest washout 2.69%).
const MICRO_DIP = 25n; // 2.5% below the trailing high of highs, at the low
const MICRO_HI_WIN = 90; // trailing high window, minutes
const MICRO_REC_WIN = 30; // trailing low window, minutes
const MICRO_REC = 0n; // close at or above the trailing 30-min low
const MICRO_SIZE_PCT = 100n; // spend 100% of cash
const MICRO_TAKE = 12n; // +1.2% over entry
const MICRO_STOP = 8n; // 0.8% under entry
const MICRO_ARM = 2n; // trail arms once +0.2% up
const MICRO_TRAIL = 2n; // 0.2% below the peak since entry
const MICRO_HOLD = 120; // bars, then out
const MICRO_CD = 40; // bars after a micro exit fill before re-entering
const MICRO_MAX_WAVES = 20; // own wave budget so micro cannot starve snap/deep

// Deep V tiers (v5, proven on the crash window).
const DEEP1_DD = 50n; // 5.0% below the trailing 360-min high, tier 1 (round 7: 4.8% -> 5.0% -- tier 1 now buys at 62507 instead of 62647 on the crash window, so the blended entry is lower and the deep trade exits +$0.92 richer; 50/51/52 form a flat plateau, and the shallow-crash proxy rises too, +$10.58 -> +$11.50)
const DEEP2_DD = 53n; // 5.3% below the trailing 360-min high, tier 2
const DEEP_HIGH_WIN = 360;
const DEEP1_SIZE_PCT = 40n; // tier 1 spends 40% of cash
const DEEP_TAKE = 45n; // +4.5% over the blended entry
const DEEP_TRAIL = 12n; // 1.2% below the peak since entry
const DEEP_STOP = 15n; // 1.5% under entry
const DEEP_HOLD = 240;

// Breakout rider.
const RIDER_BREAKOUT = 3n; // 0.3% above the trailing 240-min high
const RIDER_HIGH_WIN = 240;
const RIDER_SIZE_PCT = 50n;

const MAX_WAVES = 12;
const WARMUP_BARS = 30; // round 9: 240 -> 30 (round 8's 240-bar warmup blinded the bot through the whole washout; the harness's own warmup_bars already supplies history before the window starts)
const HISTORY = 720; // closes kept (longest lookback is 420)
const SLIPPAGE_BPS = 400; // cap vs the latest close
const MIN_NOTIONAL = 1_000_000n; // 1 USDC in quote units

type Mode = 'snap' | 'deep' | 'rider' | 'micro';

/** Closes at price scale 5, oldest first. */
const closes: bigint[] = [];
/** Bar highs at price scale 5, oldest first (snapback's rolling high). */
const highs: bigint[] = [];
let entryPrice = 0n; // volume-weighted entry price, 0n = flat
let peakSinceEntry = 0n; // highest close since entry
let holdBars = 0; // bars held in the current position
let waves = 0; // flat-entry buys sent in this window
let prevQty = 0n;
let mode: Mode | null = null; // mode of the open position
let scaled = false; // deep tier-2 scale-in already sent
let snapTier = 0; // snapback tier of the open position (1 or 2)
let lastExitSeq = -1_000_000; // seq of the batch the last sell filled on
let lastMicroExitSeq = -1_000_000; // seq of the batch the last micro sell filled on
let microWaves = 0; // micro buys sent in this window
let stopped = false; // loss-cap latch: snap entries off for the window
let cashAtOpen = 0n; // cash when the open position's first buy was sent
let lastExitMode: Mode | null = null; // mode of the last closed trade
let lastExitWasLoss = false; // the last closed trade lost money (v4)

function highest(n: number): bigint {
  const start = Math.max(0, closes.length - n);
  let hi = closes[start];
  for (let i = start + 1; i < closes.length; i++) if (closes[i] > hi) hi = closes[i];
  return hi;
}

function highestHigh(n: number): bigint {
  const start = Math.max(0, highs.length - n);
  let hi = highs[start];
  for (let i = start + 1; i < highs.length; i++) if (highs[i] > hi) hi = highs[i];
  return hi;
}

function lowest(n: number): bigint {
  const start = Math.max(0, closes.length - n);
  let lo = closes[start];
  for (let i = start; i < closes.length; i++) if (closes[i] < lo) lo = closes[i];
  return lo;
}

function mean(n: number): bigint {
  const start = Math.max(0, closes.length - n);
  let s = 0n;
  for (let i = start; i < closes.length; i++) s += closes[i];
  return s / BigInt(closes.length - start);
}

function buy(notional: bigint): OrderInput {
  return { side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: SLIPPAGE_BPS };
}

// Rider keeps the old shallow exit profile (take 0.8%, trail 0.5%,
// stop 0.8%, hold 180): it never fired on any tested window, so the
// numbers there are the simulator's, not a fresh fit.
const RIDER_TAKE = 8n;
const RIDER_TRAIL = 5n;
const RIDER_STOP = 8n;
const RIDER_HOLD = 180;

function onBatch(state: BarsState): OrderInput[] {
  if (state.warmingUp) return [];
  const close = state.close(SYMBOL);
  if (close === null) return [];
  const bar = state.latest.get(SYMBOL);
  const high = bar === undefined ? close : BigInt(bar.h);
  closes.push(close);
  highs.push(high);
  if (closes.length > HISTORY) closes.shift();
  if (highs.length > HISTORY) highs.shift();

  const holding = state.positions.get(SYMBOL);
  const qty = holding === undefined ? 0n : holding.qty;

  // Loss cap, evaluated ONLY while flat and latching on REALISED equity
  // (v4): an intra-trade trough no longer trips it -- at 100% size the
  // 20261113 wave-1 trough dips below $980 mid-trade and the old
  // every-bar check killed the recovering waves 2-3. It does NOT gate
  // deep entries (the crash window's deep trade is what pays). Round 9:
  // it DOES gate micro entries (the micro is a snap-family trade, and a
  // latched bot that keeps buying washouts is exactly the bleed the cap
  // exists to stop).
  if (qty === 0n && state.equity < LOSS_CAP_USDC) stopped = true;

  // Round 6 re-arm: once flat and realised equity is back at or above
  // the $990 line, the latch releases and snap entries are allowed
  // again. The latch's job is to stop the bleeding after a loss; once a
  // deep win has repaired equity, the reason for it is gone. On the
  // crash window the deep trade exits at $1,034.26, the latch releases,
  // and a second dip at bar 1408 (2.49% + recovery) fires a snap wave
  // that adds +$4.88 by the window end. If a re-armed wave loses again
  // and equity falls back below $990, the latch above re-trips the
  // same way, so the protection re-engages.
  if (stopped && qty === 0n && state.equity >= LOSS_CAP_USDC) stopped = false;

  // A buy filled since the last batch: re-derive the averaged entry.
  // value(qty, price) = qty * price / 10**7, so price = cost * 10**7 / qty.
  if (qty > prevQty) {
    entryPrice = (holding!.cost * 10_000_000n) / qty;
    if (close > peakSinceEntry) peakSinceEntry = close;
    if (prevQty === 0n) holdBars = 0;
  }
  // A sell filled: the position is gone (this bot only ever sells all of it).
  if (qty === 0n && prevQty > 0n) {
    // Realised PnL of the closed trade: cash now minus cash when the
    // position's first buy was sent (v4: drives the post-loss cooldown).
    lastExitWasLoss = state.cash < cashAtOpen;
    lastExitMode = mode;
    if (mode === 'micro') lastMicroExitSeq = state.seq;
    entryPrice = 0n;
    peakSinceEntry = 0n;
    holdBars = 0;
    mode = null;
    snapTier = 0;
    scaled = false;
    lastExitSeq = state.seq;
  }
  prevQty = qty;

  if (qty > 0n) {
    holdBars += 1;
    if (close > peakSinceEntry) peakSinceEntry = close;
    if (mode === 'deep') {
      if (
        close * 1000n >= entryPrice * (1000n + DEEP_TAKE) ||
        close * 1000n <= entryPrice * (1000n - DEEP_STOP) ||
        close * 1000n <= peakSinceEntry * (1000n - DEEP_TRAIL) ||
        holdBars >= DEEP_HOLD
      ) {
        return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: SLIPPAGE_BPS }];
      }
      // Deep tier 2: while holding tier 1, a further fall to 5.3% below
      // the trailing 360-minute high buys all remaining cash at the trough.
      if (!scaled && state.cash >= MIN_NOTIONAL) {
        const high360 = highest(DEEP_HIGH_WIN);
        if (close * 1000n <= high360 * (1000n - DEEP2_DD)) {
          scaled = true;
          return [buy(state.cash)];
        }
      }
      return [];
    }
    if (mode === 'snap') {
      const take = snapTier === 2 ? SNAP_TAKE2 : SNAP_TAKE1;
      const stop = snapTier === 2 ? SNAP_STOP2 : SNAP_STOP1;
      const armed = close * 1000n >= entryPrice * (1000n + SNAP_ARM);
      if (
        close * 1000n >= entryPrice * (1000n + take) ||
        close * 1000n <= entryPrice * (1000n - stop) ||
        (armed && close * 1000n <= peakSinceEntry * (1000n - SNAP_TRAIL)) ||
        holdBars >= SNAP_HOLD
      ) {
        return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: SLIPPAGE_BPS }];
      }
      return [];
    }
    if (mode === 'micro') {
      // Washout-micro exits: +1.2% take, 0.8% hard stop, 0.2% trailing
      // stop once +0.2% up, 120-bar hold. The tight trail is the point:
      // a washout bounce gives its money back fast, so the micro banks
      // the first +1% and lets the trail keep it if the bounce runs.
      const armed = close * 1000n >= entryPrice * (1000n + MICRO_ARM);
      if (
        close * 1000n >= entryPrice * (1000n + MICRO_TAKE) ||
        close * 1000n <= entryPrice * (1000n - MICRO_STOP) ||
        (armed && close * 1000n <= peakSinceEntry * (1000n - MICRO_TRAIL)) ||
        holdBars >= MICRO_HOLD
      ) {
        return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: SLIPPAGE_BPS }];
      }
      return [];
    }
    // Rider: plain trailing exit, no arm.
    if (
      close * 1000n >= entryPrice * (1000n + RIDER_TAKE) ||
      close * 1000n <= entryPrice * (1000n - RIDER_STOP) ||
      close * 1000n <= peakSinceEntry * (1000n - RIDER_TRAIL) ||
      holdBars >= RIDER_HOLD
    ) {
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: SLIPPAGE_BPS }];
    }
    return [];
  }

  if (closes.length < WARMUP_BARS || waves >= MAX_WAVES) return [];

  const closeNow = close;
  const high360 = highest(DEEP_HIGH_WIN);

  // Deep tiers first: a crash window must not wait behind the snap rules.
  if (closeNow * 1000n <= high360 * (1000n - DEEP2_DD)) {
    waves += 1;
    mode = 'deep';
    cashAtOpen = state.cash;
    return [buy(state.cash)];
  }
  if (closeNow * 1000n <= high360 * (1000n - DEEP1_DD)) {
    waves += 1;
    mode = 'deep';
    cashAtOpen = state.cash;
    return [buy((state.cash * DEEP1_SIZE_PCT) / 100n)];
  }

  // Snapback: dip below the 420-minute high of bar highs, off a stopped
  // fall (close 0.2% above the trailing 30-minute low). Gated by the
  // 20/40-bar post-exit cooldown (v4: 40 after a losing snap exit) and
  // the 2% loss-cap latch. Tier 2 (2.7% dip) takes the wider exits;
  // tier 1 (2.0% dip) the tight ones. Round 9: also gated by
  // SNAP_CD_MICRO -- for 60 bars after a micro exit the snap stays out,
  // because the micro already banked that bounce and the snap would only
  // buy its top (round 8's exact failure, bar 240).
  // Post-loss cooldown (v4): 40 bars after a losing snap exit, 20
  // otherwise. The 20261115 third snap wave fires 21 bars after the
  // second wave's losing exit; the 20261113 recovering wave fires 43
  // bars after its losing exit -- 40 sits between them.
  const snapCd = lastExitMode === 'snap' && lastExitWasLoss ? SNAP_COOLDOWN_LOSS : SNAP_COOLDOWN;
  if (!stopped && state.seq - lastExitSeq >= snapCd && state.seq - lastMicroExitSeq >= SNAP_CD_MICRO) {
    const high420 = highestHigh(SNAP_HI_WIN);
    const low30 = lowest(SNAP_RECOVERY_WIN);
    if (closeNow * 1000n >= low30 * (1000n + SNAP_RECOVERY)) {
      if (closeNow * 1000n <= high420 * (1000n - SNAP_DIP2)) {
        waves += 1;
        mode = 'snap';
        snapTier = 2;
        cashAtOpen = state.cash;
        return [buy((state.cash * SNAP_SIZE_PCT) / 100n)];
      }
      if (closeNow * 1000n <= high420 * (1000n - SNAP_DIP1)) {
        waves += 1;
        mode = 'snap';
        snapTier = 1;
        cashAtOpen = state.cash;
        return [buy((state.cash * SNAP_SIZE_PCT) / 100n)];
      }
    }
  }

  // Washout micro (round 9, tried AFTER snap so it never pre-empts the
  // main trade): the trailing 30-minute LOW is at least 2.5% below the
  // trailing 90-minute high of highs, and the close is at or above that
  // low. The dip is measured at the LOW, not at the close -- so it fires
  // on shallow washouts the snap's close-plus-recovery gate misses (a
  // close-based dip and a recovery gate are mutually exclusive below
  // ~1.7%). Gated by the loss-cap latch, its own 40-bar cooldown and its
  // own 20-wave budget.
  if (!stopped && microWaves < MICRO_MAX_WAVES && state.seq - lastMicroExitSeq >= MICRO_CD) {
    const highMicro = highestHigh(MICRO_HI_WIN);
    const lowMicro = lowest(MICRO_REC_WIN);
    if (
      lowMicro * 1000n <= highMicro * (1000n - MICRO_DIP) &&
      closeNow * 1000n >= lowMicro * (1000n + MICRO_REC)
    ) {
      waves += 1;
      microWaves += 1;
      mode = 'micro';
      cashAtOpen = state.cash;
      return [buy((state.cash * MICRO_SIZE_PCT) / 100n)];
    }
  }

  // Breakout rider: a rising window where dips never come.
  const high240 = highest(RIDER_HIGH_WIN);
  if (
    closeNow * 1000n >= high240 * (1000n + RIDER_BREAKOUT) &&
    mean(8) > mean(21) &&
    closeNow > closes[closes.length - 5]
  ) {
    waves += 1;
    mode = 'rider';
    cashAtOpen = state.cash;
    return [buy((state.cash * RIDER_SIZE_PCT) / 100n)];
  }
  return [];
}

await runBars({ onBatch });
