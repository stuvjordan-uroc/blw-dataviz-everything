# Packages

## db

database. See packages/db/README.md

## shared-schemas

- schema source files for database tables -- used by db package to generate schema migrations.
- exports typescript types representing tables and schemas for use by other packages.
- zod schemas for validating json input/output for database, exported for use by other packages

See packages/shared-schemas/README.md

## shared-auth

Utilities for authenticating admins. Exported for use by APIs in the project. See packages/shared-auth/README.md

**NOTE**: To put an admin in the database, use the seed:admin script in the database package!

## api-polls-admin

API for handling transactions by admins for running polls. See package/api-polls-admin/README.md
