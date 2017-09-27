import * as Ajv from 'ajv';
import { DB } from './DB';
import { ItemModel } from './Item';
import { JsonSchema } from './JsonSchema';
import clone = require('lodash.clonedeep');
import { ValidationError } from './ValidationError';

/**
 * Schema defines collection-wide set of methods for validating documents
 */
export class Schema<T extends ItemModel> {

  private _db: DB;
  private _schema: JsonSchema<T>;
  private _validate: Ajv.ValidateFunction;
  private _defaults: Partial<T> = {};
  private _primaryField: keyof T;
  private _type: string;


  constructor(db: DB, schema: JsonSchema<T>) {
    this._db = db;
    this._schema = clone(schema);
    this._validate = this._db.$ajv.compile(this._schema);

    // set and check primary field
    this._primaryField = Schema.FIND_PRIMARY_KEY(this._schema);
    if (!this._primaryField) {
      throw new Error('pouchstore: schema has no primary key');
    }

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
  public static FIND_PRIMARY_KEY<T extends ItemModel>(schema: JsonSchema<T>): keyof T {
    return Object.keys(schema.properties).find((prop: keyof T) => {
      return schema.properties[prop].primary === true;
    }) as keyof T;
  }

  /**
   * Gets schema items' type from a provided schema
   *
   * @param {JsonSchema<T extends ItemModel>} schema
   * @returns {string}
   * @constructor
   */
  public static GET_TYPE<T extends ItemModel>(schema: JsonSchema<T>): string | undefined {
    return schema.properties.type.const || schema.properties.type.default;
  }

  /**
   * Saves a copy of schema defaults values
   * @param schema
   * @return {Partial<T extends ItemModel>}
   */
  public static GET_DEFAULTS<T extends ItemModel>(schema: JsonSchema<T>): Partial<T> {

    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      return {};
    }

    const result: Partial<T> = {};

    Object.keys(schema.properties).forEach((prop: keyof T) => {

      const constValue = schema.properties[prop].const;
      const defaultValue = schema.properties[prop].default;

      if (defaultValue === undefined && constValue === undefined) {
        return;
      }

      const value = constValue !== undefined ? constValue : defaultValue;

      result[prop as keyof T] = clone(value);
    });

    return result;
  }

  get defaults(): Partial<T> {
    return clone(this._defaults);
  }

  get primaryField(): keyof T {
    return this._primaryField;
  }

  get type(): string {
    return this._type;
  }

  public validateDoc(doc: {}): doc is T {

    const valid = this._validate(doc);

    if (valid === true) {
      return true;
    }
    else if (this._validate.errors) {
      throw new ValidationError(this._validate.errors);
    }
    else {
      throw new Error('Unknown error occured');
    }
  }

  public validateProp<K extends keyof T>(prop: K, value: T[K]): boolean {
    // const valid = this._validate(value, `.${prop}`);
    const valid = this._db.$ajv.validate(this._schema.properties[prop], value);

    if (valid === true) {
      return true;
    }
    else if (this._db.$ajv.errors) {
      throw new ValidationError(this._db.$ajv.errors);
    }
    else {
      throw new Error('Unknown error occured');
    }
  }

}
