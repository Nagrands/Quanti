SQLite runtime migrations for the autonomous desktop application.

The existing ../migrations directory is the immutable PostgreSQL migration history
used only to export legacy installations. Runtime SQLite migrations are applied by
the packaged API before NestJS starts.
