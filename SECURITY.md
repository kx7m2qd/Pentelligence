# Security Policy

## Supported versions

Only the latest `main` branch is supported. Pull the newest image or rebuild before reporting issues.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting (Security tab -> Report a vulnerability) on this repository.
Do not open a public issue for anything that describes an exploitable weakness in Pentelligence itself.

Include: affected component, reproduction steps, and impact. You will get an initial response within a few days.

## Scope notes

- This project orchestrates security scanners (subfinder, nmap, nuclei) against targets the operator authorizes.
- Reports about what the bundled scanners find on a target are not vulnerabilities in Pentelligence.
- Deployment hardening guidance lives in the README (production checklist).
