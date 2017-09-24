import { Collection } from './Collection';
import { Item, ItemModel } from './Item';
import { ItemDoc, OnBeforeRemove } from './types';
/**
 * Options which the PouchCollection constructor is supplied with
 */
export declare class CollectionOptions<T extends ItemModel, U extends Item<T>> implements ICollectionOptions<T, U> {
    /**
     * Should attachments be loaded into items automatically
     * In this case all attachments will be 'local' by default
     * Otherwise on digest will be avaliable
     *
     * @danger May consumes a lot of extra memory!
     */
    loadAttachments: OptionLoadAttachments;
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
    onBeforeRemove: OnBeforeRemove<U>;
    constructor(options: ICollectionOptions<T, U>);
}
export interface ICollectionOptions<T extends ItemModel, U extends Item<T>> {
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
export declare type OptionLoadAttachments = boolean;
/**
 * Every item created received a type property and id in the form of '{$type}::id'
 */
export declare type OptionType = string;
/**
 * Model's primary key
 */
export declare type OptionIdField<T extends ItemModel> = keyof T;
/**
 * Model factory
 */
export declare type OptionFactory<T extends ItemModel, U extends Item<T>> = (doc: ItemDoc<T>, collection: Collection<T, U>) => U;
/**
 * Default values for model properties
 */
export declare type OptionValidator<T extends ItemModel> = (data: Partial<T>) => T;
