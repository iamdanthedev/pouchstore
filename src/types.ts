/**
 * Interface for the PouchCollection
 *
 * @interface IPouchCollection
 * @template T Interface of the incoming data (stored in the PouchDB)
 * @template U Interface or class of the data model created for each db record
 */
interface IPouchStore<T extends IPouchDataModel, U extends IPouchStoreItem<T>> {
	
	/** Subscribe to pouchdb and start listening to changes feed */
	subscribe(db: PouchDB.Database<any>): Promise<any>

	/** Unsubscribe from pouchdb */
	unsubscribe(): Promise<any>

	/** Get array of all documents sorted by ids */
	all: U[]

	/** Get all documents in the form of {id: doc,...} */
	allMap: TMapOf<U>

	/** Get item by id or index */
	get(id: string): U | undefined
	get(index: number): U | undefined

	/** Create new document */
	create(data: Partial<T>): U

	/** Write document to pouchdb */
	put(item: U): Promise<TExistingDocument<T>>

	/** Upload loadAttachments */
	upload(itemId: string, name: string, blob: Blob): Promise<void>

	/** Load attachment by name */
	loadAttachment(itemId: string, name: string): Promise<Blob | Buffer>

	/** Removes item from the collection */
	remove(itemId: string): Promise<any>
	remove(item: U): Promise<any>
}

/**
 * Options which the PouchCollection constructor is supplied with
 */
interface IPouchCollectionOptions<T extends IPouchDataModel, U extends IPouchStoreItem<T>> {
	
	/**
	 * Should attachments be loaded into models automatically
	 * In this case all attachments will be 'local' by default
	 * Otherwise on digest will be avaliable
	 * @danger May consumes a lot of extra memory!
	 */
	loadAttachments: boolean

	/** Every item created received a type property and id in the form of '{$type}::id' */
	type: string

	/** Model's primary key */
	idField: keyof T

	/** Model factory */
	factory: (doc: TDocument<T>, collection: IPouchStore<T, U>) => U

	/** Default values for model properties */
	validator: (data: Partial<T>) => T,

	onBeforeRemove?: TOnBeforeRemoveCallback<U>
}

interface IPouchCollectionConstructorOptions<T extends IPouchDataModel, U extends IPouchStoreItem<T>> {
	type: string
	factory: (doc: TDocument<T>, collection: IPouchStore<T, U>) => U
	idField: keyof T
	validator: (data: Partial<T>) => T,
}

type TPouchCollectionConstructorOptions<T extends IPouchDataModel, U extends IPouchStoreItem<T>>
	= IPouchCollectionConstructorOptions<T, U> & Partial<IPouchCollectionOptions<T, U>>

/**
 * onBeforeRemove callback
 * 
 * @param {U} Item to be removed
 * 
 * @returns {Array<TDocument<any>} Array of extra document to add to bulk_docs
 * @returns {false} To prevent the remove function from execution
 * @returns {void} To proceed the execution
 * 
 */
type TOnBeforeRemoveCallback<U> = (item: U) => Promise<TDocument<any>[] | false | void>

/**
 * Base models interface
 */
interface IPouchDataModel {
	type: string
}

/**
 * Items that PouchStores consist of should be object of this
 * or inherited class
 *
 * It provides basic ways of working with PouchStore items
 */
interface IPouchStoreItem<T extends IPouchDataModel> {

	/**
	 * PouchDB collection drawback
	 * Set by the collection which create an item
	 */
	readonly $collection: IPouchStore<T, IPouchStoreItem<T>>

	/**
	 * A copy of underlying  PouchDB doc
	 */
	readonly $doc: TDocument<T>


	/**
	 * Updates the whole doc or one of its properties
	 */
	set<DOC extends TDocument<T>>(doc: DOC | Partial<DOC>): IPouchStoreItem<T>
	set<DOC extends TDocument<T>, K extends keyof TDocument<T>>(prop: K, value: DOC[K]): IPouchStoreItem<T>

	/** If the item has been changed and not saved yet */
	isDirty: boolean

	/** If the item has never been saved */
	isNew: boolean


	/** Get property */
	get<K extends keyof T>(property: K): T[K]

	/** Attach a file to the document */
	attach(name: string, blob: Blob | Buffer, contentType: string): void

	/** Remove attachment */
	detach(name: string): void

	save(): Promise<void>

	remove(): Promise<void>


	/**
	 * Checks if attachment exists
	 * Return attachment digest (for mobx observers - to track changes)
	 */
	hasAttachment(name: string): string | undefined

	/**
	 * Returns attachment by name.
	 * Local loadAttachments will have data prop of type string | Blob | Buffer
	 */
	getAttachment(name: string): TAttachment | undefined

	/**Returns true if attachment is stored on the model */
	isLocalAttachment(name: string): boolean | undefined

	/** Loads attachment irrespectively of whether it is local or remote */
	loadAttachment(name: string): Promise<TAttachment>

	/**
	 * Loads attachment and returns a WebAPI URL Object string
	 *
	 * **Important**: Don't forget to release the object created with URL.revokeObjectURL(str)
	 */
	loadAttachmentAsURL(name: string, localOnly?: boolean): Promise<string | null>


	// loadAttachmentAsURLAsync(name: string, localOnly?: boolean): ComputedAsyncValue<string>

}


type TAttachment = PouchDB.Core.AttachmentResponse
type TAttachments = PouchDB.Core.Attachments

interface IPouchAttachmentDataModel {
	content_type: string
	digest: string
	data?: Blob
	stub?: true

}

interface IPouchAttachmentMapDataModel {
	[name: string]: IPouchAttachmentDataModel
}

interface IPouchAttachmentMap extends IPouchAttachmentMapDataModel {
	
}


type TMapOf<T> = {
	[id: string]: T,
}

type TDocument<T extends IPouchDataModel> = (TNewDocument<T> | TExistingDocument<T>)

type TNewDocument<T extends IPouchDataModel> =
	PouchDB.Core.Document<TWithAttachments<T>> & { _rev: undefined }

type TExistingDocument<T extends IPouchDataModel> =
	PouchDB.Core.ExistingDocument<TWithAttachments<T>>

type TWithAttachments<T> = T & { _attachments?: TAttachments }
