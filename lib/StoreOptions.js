"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Options which the PouchCollection constructor is supplied with
 */
class StoreOptions {
    constructor(options) {
        /**
         * Should attachments be loaded into items automatically
         * In this case all attachments will be 'local' by default
         * Otherwise on digest will be avaliable
         *
         * @danger May consumes a lot of extra memory!
         */
        this.loadAttachments = false;
        this.loadAttachments = options.loadAttachments || this.loadAttachments;
        this.type = options.type || this.type;
        this.idField = options.idField || this.idField;
        this.factory = options.factory || this.factory;
        this.validator = options.validator || this.validator;
        this.onBeforeRemove = options.onBeforeRemove || this.onBeforeRemove;
    }
}
exports.StoreOptions = StoreOptions;
//# sourceMappingURL=CollectionOptions.js.map
