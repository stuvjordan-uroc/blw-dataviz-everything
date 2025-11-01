# Shared Auth

Shared authentication utilities for NestJS APIs in the BLW DataViz project.

## Purpose

This package provides reusable authentication components:

- **Password hashing** with bcrypt
- **JWT strategy** for Passport
- **Auth guards** to protect routes
- **Decorators** to access current user

## Usage

Import this package in your NestJS APIs to add authentication without duplicating code.

```typescript
import { JwtAuthGuard, CurrentUser, PasswordService } from "shared-auth";
```
