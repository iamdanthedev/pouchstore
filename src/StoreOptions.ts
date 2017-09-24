import { Collection } from './Collection';
import { Item, ItemModel } from './Item';
import { ItemDoc, OnBeforeRemove } from './types';

/**
 * Options which the PouchCollection constructor is supplied with
 */
export class CollectionOptions<T extends ItemModel, U extends Item<T>>
  implements ICollectionOptions<T, U> {

  /**
   * Should attachments be loaded into items automatically
   * In this case all attachments will be 'local' by default
   * Otherwise on digest will be avaliable
   *
   * @danger May consumes a lot of extra memory!
   */
  public loadAttachments: OptionLoadAttachments = false;

  /**
   * Every item created received a type property and id in the form of '{$type}::id'
   */
  public type: OptionType;

  /**
   * Model's primary key
   */
  public idField: OptionIdField<T>;

  /**
   * Model factory
   */
  public factory: OptionFactory<T, U>;

  /**
   * Default values for model properties
   */
  public validator: OptionValidator<T>;

  /**
   * Hook to be evaluated before a store item it removed
   */
  public onBeforeRemove: OnBeforeRemove<U>;

  constructor(options: ICollectionOptions<T, U>) {

    this.loadAttachments = options.loadAttachments || this.loadAttachments;
    this.type = options.type || this.type;
    this.idField = options.idField || this.idField;
    this.factory = options.factory || this.factory;
    this.validator = options.validator || this.validator;
    this.onBeforeRemove = options.onBeforeRemove || this.onBeforeRemove;
  }
}

export
interface ICollectionOptions<T extends ItemModel, U extends Item<T>> {
  /**
   * Should attachments be loaded into items automatically
   * In this case all attachments will be 'local' by default
   * Otherwise on digest will be avaliable
   *
   * @danger May consumes a lot of extra memory!
   */
  loadAttachments?: OptionLoadAttachments;

  /**
   * Every item created received a type property and id in the form of '{$type}::id'
   */
  type: OptionType;

  /**
   * Model's primary key
   */
  idField: OptionIdField<T>;

  /**
   * Model factory
   */
  factory: OptionFactory<T, U>;

  /**
   * Default values for model properties
   */
  validator: OptionValidator<T>;

  /**
   * Hook to be evaluated before a store item it removed
   */
  onBeforeRemove?: OnBeforeRemove<U>;
}

export
type OptionLoadAttachments = boolean;

/**
 * Every item created received a type property and id in the form of '{$type}::id'
 */
export
type OptionType = string;

/**
 * Model's primary key
 */
export
type OptionIdField<T extends ItemModel> = keyof T;

/**
 * Model factory
 */
export
type OptionFactory<T extends ItemModel, U extends Item<T>> =
  (doc: ItemDoc<T>, collection: Collection<T, U>) => U;

/**
 * Default values for model properties
 */
export
type OptionValidator<T extends ItemModel> = (data: Partial<T>) => T;

