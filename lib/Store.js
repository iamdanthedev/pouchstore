"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mobx_1 = require("mobx");
const StoreOptions_1 = require("./StoreOptions");
const utils_1 = require("./utils");
const uuid = require('uuid');
const log = require('debug')('PouchStore');
/**
 * Creates a new PouchDB-MobX-driven collection.
 * Supports extending
 * @template T Incoming items data model interface
 * @template U Result of transforming incoming model (what we actually store on the colleciton)
 *             U can equal T if we, for example, don't provide neither options.classModel
 *             nor options.classFactory
 */
class Store {
    /**
     * Creates new PouchStore
     * It does not subsribe/attach it to any PouchDB database automatically
     * @see PouchStore#subsribe() Use subsribe to do so
     */
    constructor(options) {
        this._subscribed = false;
        /** Collection of items */
        this._items = mobx_1.observable.map();
        if (options instanceof StoreOptions_1.StoreOptions)
            this._options = options;
        else
            this._options = new StoreOptions_1.StoreOptions(options);
        log(`${this._options.type} constructor() %o`, { options: this._options });
    }
    /**
     * Subscribe to pouchdb and start listening to changes feed
     */
    subscribe(db) {
        if (!db)
            return Promise.reject('Database must be not null');
        this._db = db;
        this._items.clear();
        return this
            ._fetchAll()
            .then(() => this._subscribeToChanges())
            .then(() => {
            this._subscribed = true;
            return Promise.resolve();
        })
            .catch(err => Promise.reject(err));
    }
    /**
     * Unsubscribe from pouchdb & stop listening
     */
    unsubscribe() {
        if (this._changes)
            this._changes.cancel();
        this._db = null;
        this._items.clear();
        this._subscribed = false;
        return Promise.resolve();
    }
    /**
     * Returns array of all documents sorted by ids
     */
    get all() {
        if (!this._subscribed)
            log(`${this._options.type} attempt to access unsubscribed collection items'`);
        return this._items.values().slice();
    }
    /**
     * Returns a map of all documents
     */
    get allMap() {
        const result = {};
        this.all.forEach(item => result[item.$doc[this._options.idField]] = item);
        return result;
    }
    /** Get item by id or index */
    get(arg) {
        if (!this._subscribed)
            log(`${this._options.type} error: attempt to access unsubscribed collection items`);
        let result;
        if (typeof arg === 'string') {
            result = this._items.get(arg);
        }
        else if (typeof arg === 'number') {
            if (arg < this._items.size) {
                result = this._items.values()[arg];
            }
            else {
                log(`${this._options.type} error: index out of bounds`);
            }
        }
        else {
            log(`${this._options.type} error: get() argument must be of type string or number`);
        }
        return result;
    }
    /**
     * Creates a new object
     * It does not include it into the store
     *
     * @see Item#save()
     */
    create(data) {
        log(`${this._options.type} create() %o`, { data });
        const item = this._options.validator(data);
        const _id = this._id(item);
        const doc = Object.assign({}, item, {
            _id,
            _rev: undefined,
        });
        return this._instantiate(doc);
    }
    /** Load attachment by name */
    loadAttachment(itemId, name) {
        log('loadAttachments() %o', { itemId, name });
        if (!!!itemId || !!!name)
            return Promise.reject('ItemID or attachment names are not correct');
        return this._db
            ? this._db.getAttachment(itemId, name)
            : Promise.reject('The store is not attached to any PouchDB');
    }
    /**
     * Puts an object to the underlying db
     *
     * @todo Actually, it is, probably, not supposed to be in a public interface
     */
    put(item) {
        log(`${this._options.type} update() %o`, { item });
        if (!this._db)
            return Promise.reject('DB is not defined');
        const db = this._db;
        const doc = item.$doc;
        const _id = this._id(doc);
        const id = doc[this._options.idField];
        if (!!!_id || !!!id)
            return Promise.reject('"_id" and "id" properties must be set on an object before putting it into the DB');
        // at first, we should add the item to _items collection to prevent duplicating
        if (!this._items.has(id))
            this._setItem(item);
        // now put it into the bucket
        return db.put(doc)
            .then(() => db.get(_id))
            .then((doc) => Promise.resolve(doc))
            .catch(err => Promise.reject(err));
    }
    /** Puts an attachment to the database */
    putAttachment(itemId, name, file, contentType) {
        log('putAttachment() %o', { itemId, name, file });
        const item = this.get(itemId);
        if (!item)
            return Promise.reject('Cannot find the specified item');
        if (!!!name)
            return Promise.reject('Attachment name should not be empty');
        const db = this._db;
        const _id = this._id(itemId);
        if (!db)
            return Promise.reject('Store is not attached to any PouchDB');
        if (!!!_id)
            return Promise.reject('Could not get item\'s id');
        return db.get(_id)
            .then((doc) => db.putAttachment(doc._id, name, doc._rev, file, contentType))
            .then(() => db.get(_id))
            .then((doc) => Promise.resolve(this._addDoc(doc)))
            .catch(err => Promise.reject(err));
    }
    remove(arg) {
        log(`${this._options.type} remove() %o`, { item: arg });
        const item = typeof arg === 'string' ? this.get(arg) : arg;
        if (!item)
            return Promise.reject('Cannot get item');
        const _id = this._id(item);
        const db = this._db;
        if (!db)
            return Promise.reject('Store is not attached to PouchDB');
        if (!item || item.$collection !== this || !!!_id)
            return Promise.reject('Incorrect item provided.');
        // TODO: this should go into separate function - hook invoker
        // like this return invokeHook('onBeforeRemove').then()
        // hook invoker returns Promise.reject() if failed
        let beforeRemovePromise;
        if (this._options.onBeforeRemove) {
            beforeRemovePromise = this._options.onBeforeRemove.call(this, item);
        }
        else {
            beforeRemovePromise = Promise.resolve();
        }
        const extraDocs = [];
        return beforeRemovePromise
            .then((resp) => {
            if (resp === false)
                return Promise.reject('Operation rejected in onBeforeRemove hook');
            if (Array.isArray(resp))
                extraDocs.push(resp);
            return db.get(_id);
        })
            .then((doc) => {
            const putDoc = Object.assign(doc, { _deleted: true });
            const docs = [...extraDocs, putDoc];
            return db.bulkDocs(docs);
        })
            .then(response => Promise.resolve(response))
            .catch(err => Promise.reject(err));
    }
    _fetchAll() {
        log(`${this._options.type} _fetchAll()`);
        const db = this._db;
        if (!db)
            return Promise.reject('Store is not attached to PouchDB');
        const options = {
            include_docs: true,
            attachments: this._options.loadAttachments,
            binary: true,
            startkey: this._options.type,
            endkey: this._options.type + '::\uffff',
        };
        return db.allDocs(options)
            .then((result) => {
            result.rows.forEach(row => this._addDoc(row.doc));
            return Promise.resolve();
        })
            .catch(err => Promise.reject(err));
    }
    _subscribeToChanges() {
        log(`${this._options.type} _subscribeToChanges()`);
        const db = this._db;
        if (!db)
            return Promise.reject('Store is not attached to PouchDB');
        this._changes = db.changes({
            live: true,
            since: 'now',
            include_docs: true,
            attachments: this._options.loadAttachments,
            binary: true,
            filter(doc, params) {
                return doc.type === params.query.type;
            },
            query_params: {
                type: this._options.type,
            },
        })
            .on('change', (info) => {
            log(`${this._options.type} change info`, info);
            if (info.doc && !info.deleted)
                this._addDoc(info.doc);
            if (info.doc && info.deleted)
                this._removeItem(info.doc);
        });
        return Promise.resolve();
    }
    /** Instantiates a new object depending in modelClass and modelFactory options */
    _instantiate(doc) {
        log('_instantite() %o', { doc });
        const { factory } = this._options;
        if (!factory)
            throw new Error(`${this._options.type} factory must exist`);
        return factory(doc, this);
    }
    _setItem(item) {
        const id = item.$doc[this._options.idField];
        if (!!!id)
            throw new Error(`${this._options.type} Id field is empty, cannot add to collection`);
        this._items.set(id, item);
    }
    _addDoc(doc) {
        log(`${this._options.type} _setItem() %o`, { doc });
        const id = doc[this._options.idField];
        if (!!!id)
            throw new Error('Id field is empty, cannot add to collection');
        const item = this._items.get(id);
        if (item)
            item.set(doc);
        else
            this._setItem(this._instantiate(doc));
    }
    _removeItem(doc) {
        log(`${this._options.type} _removeItem %o`, { doc });
        this._items.delete(doc[this._options.idField]);
    }
    _id(item) {
        const typeOfU = (arg) => !utils_1.isNil(arg.$doc);
        const typeOfT = (arg) => !arg.$doc;
        const type = this._options.type;
        let id = null;
        if (typeof item === 'string')
            id = item;
        else if (typeOfU(item))
            id = item.$doc[this._options.idField];
        else if (typeOfT(item))
            id = item[this._options.idField];
        return `${type}::${id}`;
    }
}
__decorate([
    mobx_1.computed
], Store.prototype, "all", null);
__decorate([
    mobx_1.computed
], Store.prototype, "allMap", null);
__decorate([
    mobx_1.observable
], Store.prototype, "_items", void 0);
exports.Store = Store;
//# sourceMappingURL=Store.js.map