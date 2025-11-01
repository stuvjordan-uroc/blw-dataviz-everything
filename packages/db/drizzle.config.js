"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '../../.env' });
exports.default = {
    schema: '../shared-schemas/src/schemas/*.ts',
    out: './schema-migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
};
//# sourceMappingURL=drizzle.config.js.map