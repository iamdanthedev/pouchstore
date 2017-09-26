/**
 * Base Model for Objects
 * It puts the actual PouchDB document into a protected _doc property,
 * so that classes derived from **PouchBaseModel** can access the document
 * inside their getters
 */
import { isNewDocument, isNil } from './utils';
import { Collection } from './Collection';
import { Attachment, ItemDoc, MapOf } from './types';
import { DB } from './DB';

import * as Ajv from 'ajv';
import clone = require('lodash.clonedeep');
import uuid = require('uuid');
import debug = require('debug');
import { Thenable } from 'ajv';

const log = debug('pouchstore');


export interface str {[key: string]: any}

/**
 * Base models interface
 */
export interface ItemModel {
  type: string;
}


/**
 * Items that PouchStores consist of should be an object of or inherit Item
 * It provides basic ways of working with Pouchstore items
 */
export class Item<T extends ItemModel> {

  protected _collection: Collection<T, Item<T>>;

  protected _doc: ItemDoc<T>;

  protected _protectedFields: ((keyof ItemDoc<T>) | 'id')[];

  private	_dirty: boolean = false;

  /**
   * Create a new pouchstore item object.
   * Usually you would want to create new items via Collection#create() method
   *
   * @param {ItemDoc<T extends ItemModel>} doc
   * @param {Collection<T extends ItemModel, Item<T extends ItemModel>>} collection
   */
  constructor(doc: ItemDoc<T>, collection: Collection<T, Item<T>>) {
    log('constructor() %o', { doc });

    this._collection = collection;

    this._protectedFields = ['_id', '_rev', 'id'];

    const putDoc = Object.assign({}, doc);

    if (!putDoc._attachments) {
      putDoc._attachments = {};
    }

    this._set(putDoc, true);
  }

  /**
   * Checks of the doc object merged with the changes object is valid
   *
   * @param {{} | T} currentDoc
   * @param {Partial<T extends ItemModel> | T} changes
   * @param {ajv.ValidateFunction} validate
   * @returns {any | Array<ajv.ErrorObject>}
   */
  public static VALIDATE<T extends ItemModel>(
    currentDoc: T | Partial<T>,
    changes: T | Partial<T>,
    validate: Ajv.ValidateFunction
  ): T | false {

    const newdoc = Object.assign({}, currentDoc, changes);

    const valid = validate(newdoc);

    if (typeof valid !== 'boolean') {
      throw new Error('validate function returned a promise. use VALIDATE_ASYNC for async validation');
    }

    if (valid === false) {
      // tslint:disable:no-non-null-assertion
      return false;
    }

    // we expect the validate function to modify the object from type Partial<T> to T
    return newdoc as T;
  }

  /**
   * Pouchstore DB the item belongs to (via collection)
   * @returns {DB}
   */
  get $db(): DB
  {
    return this._collection.$db;
  }

  /**
   * Return a PouchDB collection this item belongs to
   * Set by the collection which creates an item
   * @return {Collection<T extends ItemModel, Item<T extends ItemModel>> & S}
   */
  get $collection(): Collection<T, Item<T>> {
    return this._collection;
  }

  /**
   * Returns **a copy** of an underlying PouchDB doc
   */
  get $doc(): ItemDoc<T> {
    return clone(this._doc);
  }

  /**
   * If the item has been changed after load/last save
   */
  get isDirty(): boolean
  {
    return this._dirty;
  }

  /**
   * If the item has never been saved
   */
  get isNew(): boolean {
    return isNewDocument(this._doc);
  }

  /**
   * Get a property of the item
   */
  public getProp<K extends keyof T>(property: K): T[K] {
    return this._doc[property];
  }

  /**
   * Updates one property of the item's underlying PouchDB document
   * Changes are not saved
   * @use Item#save()
   */
  public setProp<DOC extends ItemDoc<T>, K extends keyof ItemDoc<T>>(prop: K, value: DOC[K], dontDirty: boolean = false): this {
    if (prop && value) {
      const data: Partial<DOC> = {};
      data[prop] = value;

      return this._set(data, dontDirty);
    }

    return this;
  }

  /**
   * Updates the item's underlying PouchDB document
   * Changes are not saved
   * @use Item#save()
   */
  public setDoc<DOC extends ItemDoc<T>>(doc: DOC | Partial<DOC>, dontDirty: boolean = false): this {
    return this._set(doc, dontDirty);
  }

  /**
   * Save this item in the store. This will update the PouchDB database
   */
  public save(): Promise<void> {
    return this.$collection.put(this)
      .then(doc => {
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
  public remove(): Promise<{}> {
    if (this.isNew) {
      return Promise.reject('Item was never saved');
    }

    return this.$collection.remove(this);
  }

  /*************************************************************
   *                                                           *
   *                        ATTACHMENTS                        *
   *                                                           *
   *************************************************************/

  /**
   * Attaches a file to the document
   */
  public attach(name: string, data: Blob | Buffer, contentType: string): boolean {
    if (!!!name) {
      return false;
    }

    const attachments = this._doc._attachments ? this._doc._attachments : {};

    // const digest = md5.binaryMd5(data)
    const digest = uuid(); // FIXME: a hacky way to not calc md5 hash

    attachments[name] = {
      content_type: contentType,
      digest,
      data
    };

    // TODO: would be better to have a attachmentsMap for more fine grained control
    // TODO: to prevent refreshing all attachments on every change
    this.setProp('_attachments', attachments);

    return true;
  }

  /**
   * Removes attachment
   * This is the same as calling PouchStore#put(item)
   */
  public detach(name: string): boolean {
    log('detach', { name });

    if (!!!name) {
      return false;
    }

    const attachments = this._doc._attachments ? this._doc._attachments : {};

    if (!attachments[name]) {
      return false;
    }

    delete attachments[name];

    this.setProp('_attachments', attachments);

    return true;
  }

  /**
   * Checks if attachment exists
   * Return attachment digest (for mobx observers - to track changes)
   */
  public getAttachmentDigest(name: string): string | undefined {
    log('getAttachmentDigest() %s', name);

    if (this._doc._attachments && this._doc._attachments[name]) {
      return this._doc._attachments[name].digest;
    }
  }

  /**
   * Returns attachment by name.
   * Local attachments will have a 'data' property of type string | Blob | Buffer
   * Remote attachments will have a 'stub' property
   */
  public getAttachment(name: string): Attachment | undefined {
    log('getAttachment() %s', name);

    if (this._doc._attachments && this._doc._attachments[name]) {
      return this._doc._attachments[name];
    }
  }

  /**
   * Returns all attachments. Local attachments have data prop
   * Remote ones have stub = true
   * @returns {MapOf<Attachment>}
   */
  get attachments(): MapOf<Attachment>
  {
    return this.$doc._attachments ? this.$doc._attachments : {};
  }

  /**
   * Returns true if attachment is stored on the model
   */
  public isLocalAttachment(name: string): boolean | undefined {
    log('isLocalAttachment() %s', name);

    const att = this.getAttachment(name);

    if (att) {
      return !isNil(att.data);
    }
  }

  /**
   * Loads attachment irrespectively of whether it is local or remote
   */
  public loadAttachment(name: string): Promise<Attachment>  {

    const att = this.getAttachment(name);

    if (!att) {
      return Promise.reject('Attachment not found');
    }

    // if attachment is already loaded
    if (!isNil(att.data)) {
      return Promise.resolve(att);
    }

    // otherwise request it

    return this._collection.loadAttachment(this._doc._id, name)
      .then(data => {

        const attWithData = clone(att);
        attWithData.data = data;
        delete attWithData.stub;

        return Promise.resolve(attWithData);
      })
      .catch(err => Promise.reject(`Could not load attachment ${err}`));
  }

  /**
   * Loads attachment and returns a WebAPI URL Object string
   *
   * **Important**: Don't forget to release the object created with URL.revokeObjectURL(str)
   * https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL
   */
  public loadAttachmentAsURL(name: string, localOnly: boolean = false): Promise<string | null> {
    log('loadAttachmentAsURL()', { name, localOnly });

    if (URL === undefined) {
      return Promise.reject('WebAPI URL is not avaliable in Node.js');
    }

    if (!this.getAttachmentDigest(name)) {
      return Promise.reject('Attachment does not exist');
    }

    const att = this.getAttachment(name);

    if (!att) {
      return Promise.reject('Could not getItem attachment');
    }

    if (att.data) {
      // locally present attachment
      // we don't keep this attachment in this._attachmentMap to save memory
      return Promise.resolve(URL.createObjectURL(att.data));

    } else if (!localOnly) {
      // then we have to load if from the db

      return this.loadAttachment(name).then(loadedAtt => {
        if (loadedAtt.data) {
          return Promise.resolve(URL.createObjectURL(loadedAtt.data));
        } else {
          return Promise.reject('Could not load attachment');
        }
      });
    } else {
      // attachment exists but is not kept locally
      // that is not an error, so resolve with null, instead of rejecting
      return Promise.resolve(null);
    }
  }


  /*************************************************************
   *                                                           *
   *                        PRIVATE                            *
   *                                                           *
   *************************************************************/


  /**
   * Sets the whole underlying doc, some of its properties or a single property
   */
  protected _set<DOC extends ItemDoc<T>, K extends keyof ItemDoc<T>>(data: DOC | Partial<DOC>, dontDirty: boolean): this {
    const doc: Partial<DOC> = clone(data);

    // initial set (document is just created)
    if (!this._doc) {
      this._doc = data as DOC;

      return this;
    }

    for (const key in doc as Partial<T>) {
      if (!this._protectedFields.includes(key)) {
        this._doc[key] = clone(doc[key]);

        if (!dontDirty) {
          this._dirty = true;
        }

      } else {
        log(`set(): key ${key} is protected and was filtered out`);
      }
    }

    return this;
  }


}
