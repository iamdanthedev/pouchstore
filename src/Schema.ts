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

  constructor(db: DB, schema: JsonSchema<T>) {
    this._db = db;
    this._schema = schema;
    this._validate = this._db.$ajv.compile(this._schema);

    this._extractDefaults();
  }

  get defaults(): Partial<T> {
    return clone(this._defaults);
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

  /**
   * Saves a copy of schema defaults values
   * @private
   */
  private _extractDefaults(): void {
    const schema: JsonSchema<T> = this._schema;

    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      return;
    }

    Object.keys(schema.properties).map((prop: keyof T) => {

      const constValue = schema.properties[prop].const;
      const defaultValue = schema.properties[prop].default;

      if (defaultValue === undefined && constValue === undefined) {
        return;
      }

      const value = constValue !== undefined ? constValue : defaultValue;

      this._defaults[prop as keyof T] = clone(value);
    });
  }

}
