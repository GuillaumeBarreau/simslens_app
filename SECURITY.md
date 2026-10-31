# Security policy

## Supported versions

SimsLens has no long-term supported releases. Security fixes are made on the `master`
branch only, and deployed to the official instance by the maintainer.

| Version                 | Supported |
| ----------------------- | :-------: |
| `master` (latest)       |    Yes    |
| Older commits and tags  |    No     |
| Forks and private hosts |    No     |

If you run your own instance, update it from `master` to get the fixes.

## Reporting a vulnerability

**Do not open a public issue, pull request or discussion for a security problem.**

Report it privately through GitHub private vulnerability reporting:
[**Report a vulnerability**](https://github.com/GuillaumeBarreau/simslens_app/security/advisories/new)
(the "Security" tab of the repository, then "Report a vulnerability"). This is the only
reporting channel; no e-mail address is published.

Please include, if you can:

- the affected component (`app`, `app_dashboard`, `server`, `server_discord`,
  `companion`) and the commit or version;
- the steps to reproduce, or a proof of concept;
- the impact you expect (data exposed, account takeover, denial of service, etc.).

Reports can be written in English or French.

## What to expect

This is a project maintained on spare time, so the delays below are indicative:

- acknowledgement of your report within **7 days**;
- a first assessment (confirmed or not, severity) within **14 days**;
- a fix or a mitigation plan as soon as possible, depending on severity.

You will be kept informed in the private advisory. Once a fix is deployed, the advisory
can be published, and you will be credited if you wish.

## Scope

In scope: the code of this repository. Out of scope: the services SimsLens relies on
(Battle.net, Discord, Raidbots, Clerk), which have their own reporting programs, and
attacks that need physical access to a user's device.

Please do not test against the official instance in a way that could harm its users or
their data (no denial of service, no access to other users' data).
