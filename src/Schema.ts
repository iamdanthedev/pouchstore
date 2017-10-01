import * as Ajv from 'ajv';
import { DB } from './DB';
import { ItemModel } from './Item';
import { JsonSchema } from './JsonSchema';
import clone = require('lodash.clonedeep');
import { ValidationError } from './ValidationError';
import { trimDots } from './utils';

/**
 * Schema defines collection-wide set of methods for validating documents
 */
export class Schema<T extends ItemModel> {

  private _db: DB;
  private _schema: JsonSchema<T>;
  private _validate: Ajv.ValidateFunction;
  private _defaults: Partial<T> = {};
  private _primaryField: keyof T;
  private _indexes: string[] = [];
  private _type: string;
  private _propValidators: Map<keyof T, Ajv.ValidateFunction> = new Map();

  constructor(db: DB, schema: JsonSchema<T>) {
    this._db = db;
    this._schema = clone(schema);
    this._db.$ajv.addSchema(this._schema);
    this._validate = this._db.$ajv.compile(this._schema);

    // set and check primary field
    const primaryField: keyof T | undefined = Schema.FIND_PRIMARY_KEY(this._schema);
    if (!primaryField) {
      throw new Error('pouchstore: schema has no primary key');
    }
    else {
      this._primaryField = primaryField;
    }

    // get indexes
    this._indexes = Schema.GET_INDEXES(this._schema);
    this._indexes.push('type'); // type should always be indexes

    // set and check schema object type
    const type: string | undefined = Schema.GET_TYPE(this._schema);
    if (!type) {
      throw new Error('pouchstore: schema has no type property');
    }
    else {
      this._type = type;
    }

    // set defaults
    this._defaults = Schema.GET_DEFAULTS(this._schema);
  }

  /**
   * Finds a primary field of a schema and returns its key
   *
   * @param {JsonSchema<T extends ItemModel>} schema
   * @returns {keyof T}
   * @constructor
   */
  public static FIND_PRIMARY_KEY<T extends ItemModel>(schema: JsonSchema<T>): keyof T | undefined {
    if (schema.properties) {
      return Object.keys(schema.properties).find((prop: keyof T) => {
        // tslint:disable:no-non-null-assertion
        return schema.properties![prop].primary === true;
      }) as keyof T;
    }
  }

  /**
   * Gets schema items' type from a provided schema
   *
   * @param {JsonSchema<T extends ItemModel>} schema
   * @returns {string}
   * @constructor
   */
  public static GET_TYPE<T extends ItemModel>(schema: JsonSchema<T>): string | undefined {
    if (schema.properties) {
      return schema.properties.type.const || schema.properties.type.default;
    }
  }

  /**
   * Saves a copy of schema defaults values
   * @param schema
   * @return {Partial<T extends ItemModel>}
   */
  public static GET_DEFAULTS<T extends ItemModel>(schema: JsonSchema<T>): Partial<T> {

    if (schema.properties === undefined || Object.keys(schema.properties).length === 0) {
      return {};
    }

    const result: Partial<T> = {};

    Object.keys(schema.properties).forEach((prop: keyof T) => {

      const constValue = schema.properties![prop].const; // tslint:disable:no-non-null-assertions
      const defaultValue = schema.properties![prop].default; // tslint:disable:no-non-null-assertions

      if (defaultValue === undefined && constValue === undefined) {
        return;
      }

      const value = constValue !== undefined ? constValue : defaultValue;

      result[prop as keyof T] = clone(value);
    });

    return result;
  }

  /**
   * Extracts schema indexes
   * @copyright https://github.com/pubkey/rxdb/blob/master/src/rx-schema.js
   * @param {JsonSchema<T extends ItemModel>} schema
   * @param {string} prePath
   * @returns {string[]}
   * @constructor
   */
  public static GET_INDEXES<T extends ItemModel>(schema: JsonSchema<T>, prePath: string = ''): string[] {

    let indexes: string[] = []

    Object.keys(schema).forEach(key => {
      const obj: any = schema[key];

      const path: string = key == 'properties'
        ? prePath
        : trimDots(`${prePath}.${key}`);

      if (obj.index === true) {
        indexes.push(path);
      }

      if (typeof obj === 'object' && !Array.isArray(obj)) {
        const add = Schema.GET_INDEXES(obj, path);
        indexes = indexes.concat(add);
      }
    });

    indexes = indexes
      .filter((elem, pos, arr) => arr.indexOf(elem) == pos); // unique;

    return indexes;
  }

  get defaults(): Partial<T> {
    return clone(this._defaults);
  }

  get indexes(): string[] {
    return clone(this._indexes);
  }

  get primaryField(): keyof T {
    return this._primaryField;
  }

  get type(): string {
    return this._type;
  }

  public validateDoc(doc: {}): doc is T | never {

    const valid = this._validate(doc);

    if (valid === true) {
      return true;
    }
    else if (this._validate.errors) {
      throw new ValidationError(this._validate.errors);
    }
    else {
      throw new Error('Unknown error occurred');
    }
  }

  public validateProp<K extends keyof T>(prop: K, value: T[K]): boolean {

    let validate: Ajv.ValidateFunction;

    if (this._propValidators.has(prop)) {
      validate = this._propValidators.get(prop) as Ajv.ValidateFunction;
    }
    else {
      const schemaUri = `${this._schema.$id}/properties/${prop}`;
      validate = this._db.$ajv.getSchema(schemaUri);
      this._propValidators.set(prop, validate);
    }

    const valid = validate(value);

    if (valid === true) {
      return true;
    }
    else if (validate.errors) {
      throw new ValidationError(validate.errors);
    }
    else {
      throw new Error('Unknown error occurred');
    }
  }

}
