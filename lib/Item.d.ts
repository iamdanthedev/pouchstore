/// <reference types="pouchdb-core" />
/// <reference types="node" />
import { Collection } from './Collection';
import { Attachment, ItemDoc, MapOf } from './types';
import { DB } from './DB';
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
export declare class Item<T extends ItemModel> {
    protected _collection: Collection<T, Item<T>>;
    protected _doc: ItemDoc<T>;
    protected _protectedFields: ((keyof ItemDoc<T>) | 'id')[];
    private _dirty;
    /**
     * Create a new pouchstore item object.
     * Usually you would want to create new items via Collection#create() method
     *
     * @param {ItemDoc<T extends ItemModel>} doc
     * @param {Collection<T extends ItemModel, Item<T extends ItemModel>>} collection
     */
    constructor(doc: ItemDoc<T>, collection: Collection<T, Item<T>>);
    /**
     * Pouchstore DB the item belongs to (via collection)
     * @returns {DB}
     */
    readonly $db: DB;
    /**
     * Return a PouchDB collection this item belongs to
     * Set by the collection which creates an item
     * @return {Collection<T extends ItemModel, Item<T extends ItemModel>> & S}
     */
    readonly $collection: Collection<T, Item<T>>;
    /**
     * Returns **a copy** of an underlying PouchDB doc
     */
    readonly $doc: ItemDoc<T>;
    /**
     * If the item has been changed after load/last save
     */
    readonly isDirty: boolean;
    /**
     * If the item has never been saved
     */
    readonly isNew: boolean;
    /**
     * Get a property of the item
     */
    getProp<K extends keyof T>(property: K): T[K];
    /**
     * Updates the item's underlying PouchDB document
     * Changes are not saved
     * @use Item#save()
     */
    setDoc<DOC extends ItemDoc<T>>(doc: DOC | Partial<DOC>, dontDirty?: boolean): this;
    /**
     * Updates one property of the item's underlying PouchDB document
     * Changes are not saved
     * @use Item#save()
     */
    setProp<DOC extends ItemDoc<T>, K extends keyof ItemDoc<T>>(prop: K, value: DOC[K], dontDirty?: boolean): this;
    /**
     * Save this item in the store. This will update the PouchDB database
     */
    save(): Promise<void>;
    /**
     * Remove this item from the store.
     * This is the same as calling PouchStore#remove(item)
     */
    remove(): Promise<{}>;
    /*************************************************************
     *                                                           *
     *                        ATTACHMENTS                        *
     *                                                           *
     *************************************************************/
    /**
     * Attaches a file to the document
     */
    attach(name: string, data: Blob | Buffer, contentType: string): boolean;
    /**
     * Removes attachment
     * This is the same as calling PouchStore#put(item)
     */
    detach(name: string): boolean;
    /**
     * Checks if attachment exists
     * Return attachment digest (for mobx observers - to track changes)
     */
    getAttachmentDigest(name: string): string | undefined;
    /**
     * Returns attachment by name.
     * Local attachments will have a 'data' property of type string | Blob | Buffer
     * Remote attachments will have a 'stub' property
     */
    getAttachment(name: string): Attachment | undefined;
    /**
     * Returns all attachments. Local attachments have data prop
     * Remote ones have stub = true
     * @returns {MapOf<Attachment>}
     */
    readonly attachments: MapOf<Attachment>;
    /**
     * Returns true if attachment is stored on the model
     */
    isLocalAttachment(name: string): boolean | undefined;
    /**
     * Loads attachment irrespectively of whether it is local or remote
     */
    loadAttachment(name: string): Promise<Attachment>;
    /**
     * Loads attachment and returns a WebAPI URL Object string
     *
     * **Important**: Don't forget to release the object created with URL.revokeObjectURL(str)
     * https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL
     */
    loadAttachmentAsURL(name: string, localOnly?: boolean): Promise<string | null>;
    /*************************************************************
     *                                                           *
     *                        PRIVATE                            *
     *                                                           *
     *************************************************************/
    /**
     * Sets the whole underlying doc, some of its properties or a single property
     */
    protected _set<DOC extends ItemDoc<T>, K extends keyof ItemDoc<T>>(data: DOC | Partial<DOC>, dontDirty: boolean): this;
}
