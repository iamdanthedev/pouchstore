import { ItemDoc, NewItemDoc } from './types';
import { ItemModel } from './Item';
export declare function isNil(arg: any): arg is undefined | null;
export declare function isNewDocument<T extends ItemModel>(arg: ItemDoc<T>): arg is NewItemDoc<T>;
