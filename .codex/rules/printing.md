# Printing Rules

PDF rules:
- PDF generation uses Puppeteer + Handlebars.
- Print templates are configurable and stored in the database.
- Backend owns template rendering, HTML preparation, and PDF generation.
- Frontend only triggers print flows and handles preview, download, or save UX.

Template rules:
- Supported document templates must use explicit input contracts.
- Branding variables must be explicit and versionable.
- Do not hardcode business-specific branding in generic rendering code.
- Keep template storage and render-time data preparation separate.

API rules:
- Print endpoints must be explicit and tied to supported document workflows.
- Rendering failures must return structured errors.
