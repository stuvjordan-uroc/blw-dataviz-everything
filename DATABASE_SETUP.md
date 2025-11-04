# Database Setup Quick Reference

## First Time Setup

When you first clone this repository or need a fresh database:

```bash
# Start the system (postgres + db-migrate will run automatically)
npm run dev

# In a separate terminal, populate the database with data
npm run dev:db-populate
```

`npm run dev` automatically applies all schema migrations. The `dev:db-populate` command handles AWS authentication and runs all data migrations (including dev admin user seeding).

## Schema Migrations

### Creating New Schema Migrations

1. **Modify schema files** in `packages/shared-schemas/src/schemas/`

2. **Generate migration SQL:**

   ```bash
   npm run db:generate --workspace=db
   ```

3. **Review the generated SQL** in `packages/db/schema-migrations/`

4. **Apply the migration:**

   ```bash
   # Option 1: Run directly
   npm run db:migrate

   # Option 2: Restart db-migrate service
   docker compose up db-migrate

   # Option 3: Restart everything
   docker compose restart
   ```

### How Schema Migrations Work in Dev

- **On `npm run dev`**: The `db-migrate` service automatically runs pending migrations
- **Service behavior**: Runs once and exits with `restart: "no"`
- **After first run**: Won't automatically re-run when you add new migrations
- **To re-run**: Use one of the options in step 4 above

## Data Migrations & Seeding

Data migrations populate the database with data from S3 and include development admin user seeding.

### Quick Start (One Command)

```bash
# Authenticate with AWS and run all data migrations (including admin seeding)
npm run dev:db-populate
```

This single command:

1. Authenticates with AWS (interactive)
2. Runs all data migrations from S3
3. Seeds development admin users (skipped in production)

### Manual Control (Advanced)

If you need finer control:

```bash
# Just run data migrations (requires prior AWS auth)
npm run db:migrate:data

# Run migrations for specific schema only
npm run db:migrate:data --workspace=db -- questions
```

### Important Notes

- Data migrations include **environment-aware admin seeding** (dev only)
- Admin seeding automatically **skips in production** (NODE_ENV=production)
- AWS credentials required for question/response data from S3
- See `packages/db/README.md` for detailed data migration documentation

## Common Scenarios

### Starting Fresh

```bash
# Delete database volume and restart
docker compose down -v
npm run dev

# Populate database with data (single command)
npm run dev:db-populate
```

### Pulling New Schema Changes

```bash
git pull

# Schema migrations run automatically on restart:
docker compose restart

# Or explicitly:
npm run db:migrate
```

### Database Issues

```bash
# View database logs
docker compose logs postgres

# View migration logs
docker compose logs db-migrate

# Connect to database directly
docker exec -it blw-postgres psql -U postgres -d blw_dataviz

# Check migration status
docker exec -it blw-postgres psql -U postgres -d blw_dataviz -c "SELECT * FROM drizzle.__drizzle_migrations;"
```

## Manual Migration Commands

All these commands assume you're in the root directory:

```bash
# Schema migrations
npm run db:generate --workspace=db  # Generate new migration
npm run db:migrate --workspace=db   # Apply pending migrations
npm run db:push --workspace=db      # Push schema changes (dev only, bypasses migrations)

# Data migrations
npm run dev:db-populate             # AWS auth + all data migrations (recommended)
npm run data:migrate --workspace=db # Run all data migrations (requires prior AWS auth)
npm run data:reset --workspace=db   # Rollback data migrations (dev only)

# AWS authentication
npm run aws:auth                    # Authenticate with AWS (required for data migrations)

# Database tools
npm run db:studio --workspace=db    # Open Drizzle Studio (database GUI)
```

## See Also

- `packages/db/README.md` - Detailed database package documentation
- `README.md` - General project setup and development workflow
