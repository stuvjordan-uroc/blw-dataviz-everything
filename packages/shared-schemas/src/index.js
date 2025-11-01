"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionStatistics = exports.responses = exports.respondents = exports.pollQuestions = exports.sessions = void 0;
// Re-export all schemas
__exportStar(require("./schemas/questions"), exports);
var polls_1 = require("./schemas/polls");
Object.defineProperty(exports, "sessions", { enumerable: true, get: function () { return polls_1.sessions; } });
Object.defineProperty(exports, "pollQuestions", { enumerable: true, get: function () { return polls_1.questions; } });
Object.defineProperty(exports, "respondents", { enumerable: true, get: function () { return polls_1.respondents; } });
Object.defineProperty(exports, "responses", { enumerable: true, get: function () { return polls_1.responses; } });
Object.defineProperty(exports, "sessionStatistics", { enumerable: true, get: function () { return polls_1.sessionStatistics; } });
//# sourceMappingURL=index.js.map