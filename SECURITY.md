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

Quanti updater signing credentials are stored as GitHub Actions secrets. An
encrypted recovery key is kept outside the repository and its password is held
separately in the maintainer's macOS Keychain. Credentials must never be
committed, pasted into logs, or included in support files. The 0.1.0 macOS and
Windows installers do not carry Apple Developer ID or Microsoft Authenticode
signatures; verify their hashes against the release's `SHA256SUMS` file.
