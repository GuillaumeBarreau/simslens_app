# Third-party notices

The source code of SimsLens is released under the MIT License (see [`LICENSE`](LICENSE)).
The MIT License covers **only the code written for this project**. The third-party content
listed below is **not** covered by it and remains the property of its respective owners.

## World of Warcraft and Blizzard Entertainment

SimsLens is a non-commercial fan project. It is **not affiliated with or endorsed by
Blizzard Entertainment, Inc.**

World of Warcraft, Warcraft, Battle.net and Blizzard Entertainment are trademarks or
registered trademarks of Blizzard Entertainment, Inc. in the U.S. and/or other countries.
All other trademarks are the property of their respective owners.

The images and artwork from World of Warcraft © Blizzard Entertainment, Inc. shipped in
this repository are **excluded from the MIT License**. They are used for identification
purposes only and must not be reused outside of this context. They include:

| Path                                                              | Content                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| `app/public/src/Expansions/**` (`ui-ej-*.png`)                    | Encounter Journal boss portraits and raid backgrounds |
| `app/public/src/character/class/**` (including `discord_emojis/`) | Class icons                                           |
| `app/public/src/character/spec/**`                                | Specialization icons                                  |
| `app/public/src/character/role/**`                                | Role icons                                            |
| `app/public/src/wowico.png`, `app/public/src/vision-nzoth-2.jpg`  | Game logo and artwork                                 |
| `app/public/src/banner/**`, `app/public/src/item.jpg`             | Game key art (default banner) and item icon           |
| `app/public/src/pages/whishlistPage/backgroundImage.webp`         | Game artwork                                          |

Other images under `app/public/src/` whose origin has not been documented (character
illustrations such as `*-character.png`, `murloc-pajama.png`, `icons/default.png`, `rb*.png`, landing page
images under `pages/landingPage/`) are also excluded from the MIT License until their
provenance is confirmed.

### Battle.net API

SimsLens retrieves game data through the Blizzard Battle.net API. Use of that API, and of
the data it returns, is governed by the
[Blizzard Developer API Terms of Use](https://www.blizzard.com/en-us/legal/a2989b50-5f16-43b1-abec-2ae17cc09dd6/blizzard-developer-api-terms-of-use).
Anyone running their own instance must create their own API client on
[develop.battle.net](https://develop.battle.net/) and comply with those terms.

## Other services and logos

The logos of Discord, Raider.IO, Warcraft Logs, Wowhead, WoWProgress, YouTube and
Battle.net found under `app/public/src/` (`discord.png`, `raiderio.png`, `wclogs.png`,
`wowhead.png`, `wowprog.png`, `youtube.png`, `Battlenet_icon.svg`) are trademarks of their
respective owners, used only to link to those services, and are excluded from the MIT
License.

## Raidbots data

The server uses the equippable items data published by [Raidbots](https://www.raidbots.com/).
This data is **not redistributed** in this repository: it is downloaded on demand from
Raidbots by `server/src/scripts/data/ensureEquippableItems.js` and ignored by Git (see
SIMS-284). It remains subject to Raidbots' own terms.

## npm dependencies

The production dependencies of the npm workspaces (`app`, `app_dashboard`, `server`,
`server_discord`) are distributed under their own licenses. Summary, based on the
`license` field of the 602 production packages in `package-lock.json` (checked on
2026-10-21):

| License                                                                 | Packages |
| ----------------------------------------------------------------------- | -------: |
| MIT (including `MIT-0`, `MIT and ISC`, `MIT OR CC0-1.0`)                |      499 |
| Apache-2.0                                                              |       40 |
| ISC                                                                     |       33 |
| BSD-3-Clause (including `AFL-2.1 OR BSD-3-Clause`)                      |       18 |
| BSD-2-Clause                                                            |        4 |
| Unlicense                                                               |        4 |
| 0BSD                                                                    |        1 |
| EPL-2.0 (`elkjs`, pulled in by `prisma` → `@prisma/studio-core`)        |        1 |
| No `license` field, MIT per their `LICENSE` file (`pause`, `seq-queue`) |        2 |

No GPL, AGPL or LGPL licensed package is used in production. The desktop companion
(`companion/`, Tauri / Rust) is outside the npm workspaces and not covered by this summary.
