# Contributing to Pentelligence

## Branches and pull requests

- Branch from current `main`.
- Use one focused branch and one purpose per pull request.
- Use names such as `feat/scan-history`, `fix/recon-validation`, `docs/api-guide`, or `chore/update-ci`.
- Keep commits descriptive and use conventional prefixes.

## Before requesting review

Run the relevant checks:

```bash
npm run lint
npm run build
```

Document any checks that cannot run locally and why. Update `README.md` when setup, environment variables, public APIs, or behavior change.

## Security requirements

- Test only targets you are explicitly authorized to assess.
- Do not commit `.env`, API keys, scan outputs, database files, or reports containing client data.
- Do not commit generated directories such as `node_modules/` or `dist/`.
