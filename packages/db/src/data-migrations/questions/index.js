"use strict";
/**
 * Data migrations for the 'questions' PostgreSQL schema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionsMigrations = void 0;
const _0001_dem_characteristics_1 = require("./0001_dem_characteristics");
const questionsMigrations = [
    _0001_dem_characteristics_1.migration,
];
exports.questionsMigrations = questionsMigrations;
exports.default = questionsMigrations;
//# sourceMappingURL=index.js.map