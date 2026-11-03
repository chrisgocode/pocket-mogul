# Research 04: Trademark risk of parody company and coin names

Ticket: `issues/04-research-parody-naming-risk.md` · Researched 2026-11-03 · Names come from spec §6 (stocks) and §7 (coins).

> **This is not legal advice.** It is a product-risk screen. Ask a trademark lawyer before launch if any name stays rated High.

## Answer

- **Neither store has a parody exception.** Apple 5.2.1 bans using third-party trademarks "without permission" and "misleading, false, or copycat representations, names" ([Apple App Review Guidelines §5.2.1][apple]). Google Play bans "use of an identical or similar trademark in a way that is likely to cause confusion" ([Google Play IP policy][gplay-ip]). The word "parody" does not appear in either policy. App review is a human judgment call, and rights holders can file IP complaints against your app with either store.
- **US law gives in-game parody a fair amount of room, but not unlimited room.** Courts have protected fictional or near-real brands *inside* the content of a game under the Rogers test: the Play Pen → "Pig Pen" strip club in GTA: San Andreas ([E.S.S. v. Rock Star, 9th Cir. 2008][ess]) and real Humvees in Call of Duty ([AM General v. Activision, S.D.N.Y. 2020][amgen]). After *Jack Daniel's v. VIP* (2023), that protection is gone when the parody mark is used **as your own source identifier**, such as the app name, icon, store screenshots used as branding, or merchandise ([Jack Daniel's, 599 U.S. ___ (2023)][jd]). Dilution of famous marks follows the same line: the parody exclusion does not apply when the mark is "used as a designation of source" ([15 U.S.C. §1125(c)(3)(A)][1125]).
- **The real exposure is the famous, litigious brands that sit in their own sector.** Apple (a pear in the tech sector) and Microsoft (a near-identical name in tech) are the two High risks. Apple formally opposed a recipe app's *pear* logo and got it redrawn ([Prepear settlement, MacRumors 2021][prepear]). Microsoft pushed "Lindows" into renaming itself Linspire ([Microsoft press release, 2004][lindows]). Starbucks spent about ten years fighting "Charbucks" ([Starbucks v. Wolfe's Borough, 2d Cir. 2013][charbucks]). Its dilution claim failed, but the cost of that fight is itself the risk.
- **Recommendation:** rename **Pear Technologies** and **Macrosoft**. Adjust **BrewBucks**, **JungleCart**, **Golden Bun** and **Bark Coin** so they nod to the real brand through *theme* rather than *word form*. The rest are fine as they are. Keep every real brand name out of the app name, icon, store metadata and keywords (Apple 2.3.7, 4.1(c)). Also change the tickers that collide with real listed tickers (see the notes below the table).

## Per-name risk

Rating key. **High**: a reviewer or the brand owner would probably see it as copying the mark (near-identical spelling or sound, or the same signature motif, in the same sector as a famous, actively enforced mark). **Medium**: recognisable on purpose through a distinctive element of the mark, or the brand has a record of enforcing similar coinages. **Low**: refers to the category or a general concept, not to the mark itself.

### Stocks (spec §6)

| Ticker | Name | Real brand evoked | Risk | Reason |
|---|---|---|---|---|
| PEAR | Pear Technologies | Apple (AAPL) | **High** | Fruit swap in the same sector as one of the world's most famous marks. The spec's "geometric pear" logo is the exact motif Apple opposed in the Prepear case ([prepear]). Apple 5.2.5 also tells reviewers to watch for anything "confusingly similar" to Apple products ([apple]). The PEAR ticker was also used by a real listed company (Pear Therapeutics). |
| MCR | Macrosoft | Microsoft (MSFT) | **High** | Changes one morpheme and keeps "-soft", in the same tech sector. Very close in sight and sound to a famous mark whose owner has sued over "-dows" names ([lindows]). This is the "minor changes to another … name" pattern that Apple 4.1(a) names ([apple]). |
| JGL | JungleCart | Amazon (AMZN) | **Medium** | "Jungle" stands in for Amazon the rainforest, and "Cart" is generic. There is no shared word, but put together with e-commerce and a parcel-and-vine logo, it clearly points at Amazon. Fine if the logo avoids Amazon's smile arrow and orange/black palette. |
| CBR | CartBarn | Walmart / Costco / Target | Low | Generic retail words. Not tied to any one mark. |
| VLT | Voltara Motors | Tesla (TSLA) | Low | Evokes EVs through "volt" without copying Tesla's name, T logo or "Model" naming. Avoid "Volt" alone: Chevrolet Volt is a GM mark. |
| LPR | LoopRide | Uber / Lyft | Low | Descriptive ride-share concept. No borrowed mark. |
| BRK | Brickbank | JPMorgan / big banks (generic) | Low (name) | The name is generic. **But BRK is Berkshire Hathaway's ticker root (BRK.A / BRK.B)**, so change it to avoid a real-ticker mix-up. |
| VCR | VaultCard | Visa / Mastercard / Amex | Low | Generic finance words. Avoid interlocking circles (Mastercard) and the blue/gold wordmark (Visa). |
| SGR | SunGrid | NextEra / solar utilities | Low | Descriptive. Run a quick check, because "SunGrid" may be in use by real small solar firms (not verified). |
| BRL | BarrelWorks | ExxonMobil / Chevron (generic oil) | Low | Generic. Avoid a red Pegasus, a shell shape or chevrons. |
| BRW | BrewBucks | Starbucks (SBUX) | **Medium** | Keeps the distinctive "-bucks" suffix in coffee, the same element behind Starbucks' ten-year "Charbucks" case ([charbucks]). Safer: drop "-bucks" (e.g. "BrewBarn", "Bean Street"). If kept, never use a green circular siren-style mark. |
| GBN | Golden Bun | McDonald's ("Golden Arches") / Burger King | **Medium** | "Golden" plus fast food echoes McDonald's "Golden Arches" mark. McDonald's enforces aggressively (e.g. "Mc" prefix cases). Low if the logo is clearly a bun and not an "M"/arch shape and not red with yellow. |

### Coins (spec §7)

| Ticker | Name | Real brand evoked | Risk | Reason |
|---|---|---|---|---|
| BKC | Block Crown | Bitcoin (BTC) | Low | "Bitcoin" is not owned as a trademark by any single entity. Avoid the orange circled ₿ glyph. |
| EMB | Ember Chain | Ethereum / Ether (ETH) | Low | Sound-alike only ("Ether" → "Ember"). Avoid the Ethereum diamond/octahedron logo. |
| MOS | Moss Network | None specific | Low | Generic. |
| SPK | Spark Token | XRP / Stellar (payments coins) | Low | Generic word. |
| BRKX | Bark Coin | Dogecoin / Shiba Inu | **Medium** | The meme-dog idea is fine. Risk comes from a Shiba Inu face icon copying the Doge meme image (a copyright issue more than trademark), and from "BARK" being BARK Inc.'s NYSE ticker and brand (BarkBox). Use an original dog icon. Do not use the Doge photo. |
| MBN | Moon Bean | Generic "to the moon" meme coins | Low | Not a real mark. |

**Ticker collisions** (flagged for the spec owner; not verified exhaustively): BRK (Berkshire Hathaway), PEAR (formerly Pear Therapeutics), MCR (MFS Charter Income Trust), and BARK (BARK Inc., close to BRKX). Tickers are not usually trademarks, but matching a real listed symbol makes a "real stock" reading more likely and adds no value. Prefer tickers that are not live on NYSE/Nasdaq.

## What makes a name safe enough

The aim is to stay on the "conjure up but contrast" side the Supreme Court described: a parody "must also create contrasts", and once it does, it "is not often likely to create confusion" ([jd]).

1. **Evoke the category or the joke, not the mark's form.** No shared distinctive syllable (e.g. "-soft", "-bucks", "Mc-"), no one-letter or one-morpheme swaps, and no rhyme or sound-alike of the full mark.
2. **Don't stack signals.** Name + same sector + signature motif (fruit, smile arrow, siren, arches) + house colours together make confusion likely. Keep at most one recognisable signal, ideally the sector.
3. **Original logos in the game's own visual system** (the spec already requires this). Do not reproduce the owner's logo shape, silhouette or colour scheme. The Prepear fix was a single leaf change. Do not rely on cosmetic tweaks like that.
4. **In-game only.** Never use a parody name or mark in the app name, subtitle, icon, store screenshots used as branding, keywords or ads. This keeps the use expressive rather than "a designation of source" ([jd], [1125]) and complies with Apple 2.3.7 / 4.1(c) and Google's confusion test ([apple], [gplay-ip]).
5. **No implied affiliation or real data.** Fictional news must not describe real executives, products or events. Add a short "All companies and coins are fictional" line in the market screen or About page. This supports the "not explicitly misleading" Rogers prong ([ess]).
6. **Avoid famous, litigious owners in their own sector.** Apple, Microsoft, Starbucks, McDonald's and Disney are worth a wider margin than generic sectors.
7. **Quick clearance step:** search each final name in the USPTO trademark search (https://tmsearch.uspto.gov/) in classes 9, 28 and 41 (software and games), and do a web search, before freezing content IDs. USPTO's own explainer lists the confusion factors to check: mark similarity, related goods, channels and intent ([USPTO infringement][uspto]).

### Suggested replacements (optional)

- Pear Technologies → **Quince Computing**, **Orbit Devices**, or **Prism Labs** (no fruit + tech pairing that points to Apple, or pick a fruit nobody owns in tech, and keep the logo abstract).
- Macrosoft → **Kilobyte Systems** or **Gridworks Software**.
- BrewBucks → **Bean Street** or **Daily Grind Co.**
- JungleCart → keep, with an original logo. Or use **ParcelVine** to match the spec's parcel-with-vine mark.

## How comparable games handle it

- **Grand Theft Auto V** has an in-game stock market (BAWSAQ, a NASDAQ parody, and LCN) full of parody companies, such as Bean Machine (coffee) and Fruit (computers). Rockstar uses obvious satirical contrast and keeps those names out of the game's own branding. The Ninth Circuit protected Rockstar's "Pig Pen" parody of a real club ([ess]). (Game details are from fan guides: [GTA BAWSAQ wiki][gtawiki], [SegmentNext guide][segnext]. These are secondary sources.)
- **Call of Duty** depicts real products (Humvees) for realism, and that survived a trademark suit under Rogers ([amgen]). That was a big-budget, litigated outcome, though. It is not a model for a small mobile app.
- Typical idle/tycoon mobile games mostly use generic or pun names that are not tied to one brand, which matches the "Low" rows above. (This is an observation, not a sourced survey.)

## Sources

Primary:
- [apple]: Apple, *App Store Review Guidelines* §§2.3.7, 4.1, 5.2.1, 5.2.5. https://developer.apple.com/app-store/review/guidelines/
- [gplay-ip]: Google Play Developer Policy Center, *Intellectual Property*. https://support.google.com/googleplay/android-developer/answer/9888072
- Google Play, *Misrepresentation* (impersonation of organizations). https://support.google.com/googleplay/android-developer/answer/9888689
- [jd]: *Jack Daniel's Properties, Inc. v. VIP Products LLC*, 599 U.S. ___ (decided June 8, 2023). https://www.supremecourt.gov/opinions/22pdf/22-148_3e04.pdf
- [1125]: 15 U.S.C. §1125(c) (dilution; fair-use/parody exclusion). https://www.law.cornell.edu/uscode/text/15/1125
- [ess]: *E.S.S. Entertainment 2000 v. Rock Star Videos*, 547 F.3d 1095 (9th Cir. 2008). https://cyberlaw.stanford.edu/content/files/datastore/opinions/2008/11/05/0656237.pdf
- [charbucks]: *Starbucks Corp. v. Wolfe's Borough Coffee*, 736 F.3d 198 (2d Cir. 2013). https://law.justia.com/cases/federal/appellate-courts/ca2/12-364/12-364-2013-11-15.html
- [uspto]: USPTO, *About trademark infringement*. https://www.uspto.gov/page/about-trademark-infringement
- [lindows]: Microsoft, "Microsoft and Lindows Settle Trademark Case" (July 19, 2004). https://news.microsoft.com/source/2004/07/19/microsoft-and-lindows-settle-trademark-case/

Secondary (used for facts without an accessible primary source):
- [amgen]: *AM General v. Activision Blizzard*, No. 17-cv-8644 (S.D.N.Y. Mar. 31, 2020), summary: https://blog.ericgoldman.org/?p=20999
- [prepear]: MacRumors, "Prepear Changes Pear Logo to Settle Trademark Dispute With Apple" (Feb 9, 2021). https://www.macrumors.com/2021/02/09/prepear-settles-apple-trademark-dispute/
- [gtawiki]: https://gta.fandom.com/wiki/BAWSAQ · [segnext]: https://segmentnext.com/gta-5-stock-market-lcnbawsaq-trading-tips-and-rivals-guide

Not verified: whether "SunGrid", "Voltara" or "Macrosoft" are registered marks of unrelated real companies. The USPTO search in criterion 7 covers this.
