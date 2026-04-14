# Quanti Rules Index

Project rules -> project.md
Architecture rules -> architecture.md
Database rules -> database.md
Document rules -> documents.md
Finance rules -> finance.md
Backend rules -> backend.md
Frontend rules -> frontend.md
Desktop rules -> desktop.md
Reporting rules -> reporting.md
Printing rules -> printing.md
Testing rules -> testing.md
Workflow rules -> workflow.md
Commit rules -> commits.md

Scope
- Rules in this folder are mandatory for any change that touches the matching area.
- If a rule in this folder conflicts with a general prompt, task prompt, or scaffold prompt, this folder wins.

Defaults
- Keep changes minimal and scoped to the requested outcome.
- Do not scaffold or restructure the project from prompts alone without checking these rules first.
- Do not mix UI, API, database, and desktop responsibilities in the same module.
- Update tests when behavior or business rules change.
- Update project documentation when architecture or workflow rules change.
