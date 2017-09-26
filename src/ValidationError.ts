import * as Ajv from 'ajv';

/**
 * ValidationError is thrown when document validation fails
 */
export class ValidationError extends Error {

  private _message: string;
  private _errors: Ajv.ErrorObject[];

  constructor(errors: Ajv.ErrorObject[]) {
    const mes = `pouchstore validation error: ${JSON.stringify(errors)}`
    super(mes);
    this._message = mes;
    this._errors = errors;
  }

  public toString(): string {
    return this._message;
  }

}
