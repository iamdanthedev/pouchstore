"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isNil(arg) {
    return typeof arg === 'undefined' || arg === 'null';
}
exports.isNil = isNil;
function isNewDocument(arg) {
    return isNil(arg._rev);
}
exports.isNewDocument = isNewDocument;
//# sourceMappingURL=utils.js.map