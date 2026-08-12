# Security policy

## Supported versions

Security fixes are provided for the latest stable Quanti release. Pre-release
and development builds are supported only until the next build is published.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability and do not attach
databases, transfer packages, signing keys, certificates, or runtime logs that
contain business data.

Use GitHub's private vulnerability reporting for this repository. Include the
affected version and platform, impact, reproduction steps, and the smallest
sanitized example needed to demonstrate the issue. You should receive an
acknowledgement within seven days.

Quanti release signing credentials are stored only as GitHub Actions secrets.
They must never be committed, pasted into logs, or included in support files.
