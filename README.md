<p align="center" style="display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 6px; text-align: center;">
  <a style="display: inline-flex; align-items: center;" href="https://gomate.live"><img style="display: block;" src="public/icon-512.png" width="72" height="72" alt="GoMate footsteps logo"></a>
</p>

<h1 align="center" style="text-align: center;">GoMate</h1>

<p align="center" style="text-align: center;">
  <strong>Good places. Great company.</strong><br>
  Discover nearby places. Start or join a group, and head out together.
</p>

<p align="center" style="display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 6px; text-align: center;">
  <a style="display: inline-flex; align-items: center;" href="https://github.com/redisread/gomate/actions/workflows/ci.yml"><img style="display: block;" src="https://github.com/redisread/gomate/actions/workflows/ci.yml/badge.svg?event=pull_request" alt="CI"></a>
  <a style="display: inline-flex; align-items: center;" href="https://github.com/redisread/gomate"><img style="display: block;" src="https://img.shields.io/github/stars/redisread/gomate?style=flat&amp;color=111111" alt="GitHub stars"></a>
  <a style="display: inline-flex; align-items: center;" href="https://gomate.live"><img style="display: block;" src="https://img.shields.io/badge/Live-gomate.live-D97706" alt="Live demo"></a>
</p>

<p align="center" style="text-align: center;">
  <strong><a href="https://gomate.live">Try GoMate</a></strong> &nbsp;·&nbsp; <a href="docs/development-and-deployment.md#快速开始">Quick start</a> &nbsp;·&nbsp; <a href="#documentation">Documentation</a> &nbsp;·&nbsp; <a href="https://github.com/redisread/gomate/issues">Report an issue</a>
</p>

<p align="center" style="text-align: center;">
  English &nbsp;/&nbsp; <a href="README.zh-CN.md">简体中文</a>
</p>

[![GoMate homepage in Chinese, with featured destinations and group navigation](docs/images/gomate-home.png)](https://gomate.live)

## What is GoMate?

Want to head out but need somewhere to go or someone to join you? GoMate brings place discovery and group planning together.

- **Discover places** — Browse a map or filter by city and interests. Check tags and transport information before choosing a destination.
- **Create a group** — Pick a place, set a time, group size, and requirements, then invite others to join.
- **Join an outing** — Apply to a group and wait for the organizer's approval. Manage your groups and applications in one place.

Browse places → Choose a destination → Create or join a group → Get confirmed → Head out together.

### Explore places

Browse destinations, interests, and transport information before choosing where to go. The screenshots show the Chinese interface.

<img src="docs/images/gomate-locations.png" width="960" alt="GoMate place discovery page showing destination photos, descriptions, city labels, and interest tags">

## Tech stack

| Category       | Technologies                 |
| -------------- | ---------------------------- |
| Interface      | Astro · React · Tailwind CSS |
| Services       | Hono · Cloudflare Workers    |
| Authentication | Better Auth                  |
| Database       | Cloudflare D1 · Drizzle ORM  |
| File storage   | Cloudflare R2                |
| Email          | Resend                       |

## Documentation

The technical guides below are currently written in Chinese.

| Guide                                                            | Contents                                                 |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| [Development and deployment](docs/development-and-deployment.md) | Quick start, local commands, testing, and deployment     |
| [Local development](docs/local-dev-worktrees.md)                 | Worktrees, environment variables, local storage, and E2E |
| [API](docs/backend-api.md)                                       | Endpoints, authentication, and response contracts        |
| [Database](docs/database.md)                                     | Data relationships, migrations, and storage constraints  |
| [Frontend pages](docs/frontend-pages.md)                         | Pages, SSR, and client-side behavior                     |
| [Design system](docs/design-system.md)                           | Components, visual conventions, and interaction patterns |
| [Coding standards](CODING_STANDARDS.md)                          | Engineering constraints and validation gates             |
| [Agent entry point](AGENTS.md)                                   | Which project rules to read for each task                |
| [Production changes](docs/prod-change-policy.md)                 | Protected releases, resource changes, and rollback       |

## Contributing

Found a bug or have an idea? [Open an issue](https://github.com/redisread/gomate/issues) with the use case, expected behavior, and relevant reproduction steps.

Before making changes, read [AGENTS.md](AGENTS.md) and the applicable [coding standards](CODING_STANDARDS.md). Keep documentation aligned with behavior, run the required checks, and follow the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

The Flutter mobile client is archived in [gomate-mobile](https://github.com/redisread/gomate-mobile).

## Star History

If GoMate helps you find your next outing, a ⭐ helps others discover it.

<a href="https://www.star-history.com/?repos=redisread%2Fgomate&amp;type=date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=redisread/gomate&amp;type=date&amp;theme=dark">
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=redisread/gomate&amp;type=date">
    <img alt="GoMate star history chart" src="https://api.star-history.com/chart?repos=redisread/gomate&amp;type=date" width="800">
  </picture>
</a>

## License

MIT.
