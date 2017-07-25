import { PouchStore } from './Pouchstore'

/**
 * Options which the PouchCollection constructor is supplied with
 */
export
class PouchStoreOptions<T extends PouchstoreModel, U extends IPouchStoreItem<T>> {

  constructor(options: IPouchStoreOptions<T, U>) {

    this.loadAttachments = options.loadAttachments || this.loadAttachments
    this.type = options.type || this.type
    this.idField = options.idField || this.idField
    this.factory = options.factory || this.factory
    this.validator = options.validator || this.validator
    this.onBeforeRemove = options.onBeforeRemove || this.onBeforeRemove

  }


  /**
   * Should attachments be loaded into items automatically
   * In this case all attachments will be 'local' by default
   * Otherwise on digest will be avaliable
   *
   * @danger May consumes a lot of extra memory!
   */
  loadAttachments: boolean = false

  /** Every item created received a type property and id in the form of '{$type}::id' */
  type: string

  /** Model's primary key */
  idField: keyof T

  /** Model factory */
  factory: <S extends PouchStore<T, U>>(doc: TDocument<T>, collection: S) => U

  /** Default values for model properties */
  validator: (data: Partial<T>) => T

  /** Hook to be evaluated before a store item it removed */
  onBeforeRemove: TOnBeforeRemoveCallback<U>
}

export
interface IPouchStoreOptions<T extends PouchstoreModel, U extends IPouchStoreItem<T>> {
  /**
   * Should attachments be loaded into items automatically
   * In this case all attachments will be 'local' by default
   * Otherwise on digest will be avaliable
   *
   * @danger May consumes a lot of extra memory!
   */
  loadAttachments?: boolean

  /** Every item created received a type property and id in the form of '{$type}::id' */
  type: string

  /** Model's primary key */
  idField: keyof T

  /** Model factory */
  factory: <S extends PouchStore<T, U>>(doc: TDocument<T>, collection: S) => U

  /** Default values for model properties */
  validator: (data: Partial<T>) => T

  /** Hook to be evaluated before a store item it removed */
  onBeforeRemove?: TOnBeforeRemoveCallback<U>
}
