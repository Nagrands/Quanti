# Desktop Rules

Desktop scope:
- Tauri is the desktop shell and native integration layer.
- The desktop layer is not the ERP business backend.

Allowed responsibilities:
- file import and export
- save dialogs and open dialogs
- filesystem access within explicit security policy
- desktop packaging and OS integration

Rules:
- Tauri commands must be explicit, validated, and security-scoped.
- Native capabilities must be exposed through narrow interfaces.
- Do not duplicate NestJS business logic in Tauri commands.
- Keep OS-specific handling isolated from general UI code.
- Any offline or local-storage mode must still obey the same business invariants as the online path.
