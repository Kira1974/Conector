"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCorrelationId = exports.formatTimestampWithoutZ = void 0;
function formatTimestampWithoutZ() {
    const now = new Date();
    return now.toISOString().slice(0, -1);
}
exports.formatTimestampWithoutZ = formatTimestampWithoutZ;
function generateCorrelationId() {
    const timestamp = Date.now().toString();
    return timestamp.padStart(15, '0');
}
exports.generateCorrelationId = generateCorrelationId;
//# sourceMappingURL=timestamp.util.js.map