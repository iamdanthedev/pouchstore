"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Base Model for Objects
 * It puts the actual PouchDB document into a protected _doc property,
 * so that classes derived from **PouchBaseModel** can access the document
 * inside their getters
 */
const utils_1 = require("./utils");
const clone = require('lodash.clonedeep');
const uuid = require('uuid');
const log = require('debug')('pouchstore');
/**
 * Items that PouchStores consist of should be an object of or inherit Item
 * It provides basic ways of working with Pouchstore items
 */
class Item {
    /**
     * Create a new pouchstore item object.
     * Usually you would want to create new items via Store#create() method
     *
     * @param {ItemDoc<T extends ItemModel>} doc
     * @param {Store<T extends ItemModel, Item<T extends ItemModel>> & S} collection
     */
    constructor(doc, collection) {
        this._dirty = false;
        log('constructor() %o', { doc });
        this._collection = collection;
        this._protectedFields = ['_id', '_rev', 'id'];
        const putDoc = Object.assign({}, doc);
        if (!putDoc._attachments)
            putDoc._attachments = {};
        this._set(putDoc, true);
    }
    /**
     * Return a PouchDB collection this item belongs to
     * Set by the collection which creates an item
     */
    get $collection() {
        return this._collection;
    }
    /**
     * Returns **a copy** of an underlying PouchDB doc
     */
    get $doc() {
        return clone(this._doc);
    }
    /** If the item has been changed after load/last save */
    get isDirty() {
        return this._dirty;
    }
    /** If the item has never been saved */
    get isNew() {
        return utils_1.isNewDocument(this._doc);
    }
    /** Get a property of the item */
    get(property) {
        return this._doc[property];
    }
    /** @internal */
    set(docOrProp, ...args) {
        log('set()', { docOrProp, args });
        let doc = null;
        let prop = null;
        let value = null;
        let dontDirty = false;
        if (typeof docOrProp === 'string') {
            prop = docOrProp;
            if (args.length == 0)
                throw new Error('Wrong arguments');
            value = args[0];
            dontDirty = args.length == 2 ? args[1] : false;
        }
        else if (typeof docOrProp === 'object') {
            doc = docOrProp;
            dontDirty = args.length == 1 ? args[0] : false;
        }
        if (prop && value) {
            const data = {};
            data[prop] = value;
            return this._set(data, dontDirty);
        }
        else if (doc) {
            return this._set(doc, dontDirty);
        }
        else {
            return this;
        }
    }
    /** Save this item in the store. This will update the PouchDB database */
    save() {
        return this.$collection.put(this)
            .then((doc) => {
            this._doc = doc;
            this._dirty = false;
            return Promise.resolve();
        })
            .catch(err => Promise.reject(err));
    }
    /**
   * Remove this item from the store.
   * This is the same as calling PouchStore#remove(item)
   */
    remove() {
        if (this.isNew)
            return Promise.reject('Item was never saved');
        return this.$collection.remove(this);
    }
    /*************************************************************
     *                                                           *
     *                        ATTACHMENTS                        *
     *                                                           *
     *************************************************************/
    /** Attaches a file to the document */
    attach(name, data, contentType) {
        if (!!!name)
            return false;
        const attachments = this._doc._attachments ? this._doc._attachments : {};
        // const digest = md5.binaryMd5(data)
        const digest = uuid(); // FIXME: a hacky way to not calc md5 hash
        attachments[name] = {
            content_type: contentType,
            digest: digest,
            data: data
        };
        // TODO: would be better to have a attachmentsMap for more fine grained control
        // TODO: to prevent refreshing all attachments on every change
        this.set('_attachments', attachments);
        return true;
    }
    /**
     * Removes attachment
     * This is the same as calling PouchStore#put(item)
     */
    detach(name) {
        if (!!!name)
            return false;
        const attachments = this._doc._attachments ? this._doc._attachments : {};
        if (!attachments[name])
            return false;
        delete attachments[name];
        this.set('_attachments', attachments);
        return true;
    }
    /**
     * Checks if attachment exists
     * Return attachment digest (for mobx observers - to track changes)
     */
    getAttachmentDigest(name) {
        log('getAttachmentDigest() %s', name);
        if (this._doc._attachments && this._doc._attachments[name])
            return this._doc._attachments[name].digest;
    }
    /**
     * Returns attachment by name.
     * Local attachments will have a 'data' property of type string | Blob | Buffer
     * Remote attachments will have a 'stub' property
     */
    getAttachment(name) {
        log('getAttachment() %s', name);
        if (this._doc._attachments && this._doc._attachments[name])
            return this._doc._attachments[name];
    }
    /**
     * Returns all attachments. Local attachments have data prop
     * Remote ones have stub = true
     * @returns {MapOf<Attachment>}
     */
    get attachments() {
        return this.$doc._attachments ? this.$doc._attachments : {};
    }
    /** Returns true if attachment is stored on the model */
    isLocalAttachment(name) {
        log('isLocalAttachment() %s', name);
        const att = this.getAttachment(name);
        if (att)
            return !utils_1.isNil(att.data);
    }
    /** Loads attachment irrespectively of whether it is local or remote */
    loadAttachment(name) {
        const att = this.getAttachment(name);
        if (!att)
            return Promise.reject('Attachment not found');
        // if attachment is already loaded
        if (!utils_1.isNil(att.data))
            return Promise.resolve(att);
        // otherwise request it
        return this._collection.loadAttachment(this._doc._id, name)
            .then((data) => {
            const attWithData = clone(att);
            attWithData.data = data;
            delete attWithData.stub;
            return Promise.resolve(attWithData);
        })
            .catch(err => Promise.reject('Could not load attachment' + err));
    }
    /**
     * Loads attachment and returns a WebAPI URL Object string
     *
     * **Important**: Don't forget to release the object created with URL.revokeObjectURL(str)
     * https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL
     */
    loadAttachmentAsURL(name, localOnly = false) {
        log('loadAttachmentAsURL()', { name, localOnly });
        if (typeof URL === 'undefined')
            return Promise.reject('WebAPI URL is not avaliable in Node.js');
        if (!this.getAttachmentDigest(name))
            return Promise.reject('Attachment does not exist');
        const att = this.getAttachment(name);
        if (!att)
            return Promise.reject('Could not get attachment');
        if (att.data) {
            //locally present attachment
            // we don't keep this attachment in this._attachmentMap to save memory
            return Promise.resolve(URL.createObjectURL(att.data));
        }
        else if (!localOnly) {
            // then we have to load if from the db
            return this.loadAttachment(name).then((att) => {
                if (att.data)
                    return Promise.resolve(URL.createObjectURL(att.data));
                else
                    return Promise.reject('Could not load attachment');
            });
        }
        else {
            // Attachment exists but is not kept locally
            // That is not an error, so resolve with null, instead of rejecting
            return Promise.resolve(null);
        }
    }
    /*************************************************************
     *                                                           *
     *                        PRIVATE                            *
     *                                                           *
     *************************************************************/
    /** Sets the whole underlying doc, some of its properties or a single property */
    _set(data, dontDirty) {
        const doc = clone(data);
        // initial set (document is just created)
        if (!this._doc) {
            this._doc = data;
            return this;
        }
        for (var key in doc) {
            if (!this._protectedFields.includes(key)) {
                this._doc[key] = clone(doc[key]);
                if (!dontDirty)
                    this._dirty = true;
            }
            else {
                log(`set(): key ${key} is protected and was filtered out`);
            }
        }
        return this;
    }
}
exports.Item = Item;
//# sourceMappingURL=Item.js.map