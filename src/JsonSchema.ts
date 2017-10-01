/**
 * MIT License
 *
 * Copyright (c) 2016 Richard Adams (https://github.com/enriched)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { ItemModel } from './Item';

export type JsonSchemaFormats = 'date'
  | 'time'
  | 'date-time'
  | 'email'
  | 'uuid'
  | 'hostname'
  | 'ipv4'
  | 'ipv6'
  | 'url'
  | 'uri'
  | 'uri-reference'
  | 'uri-template'
  | 'json-pointer';

export type JsonSchemaSimpleTypes = 'string'
  | 'number'
  | 'object'
  | 'array'
  | 'boolean'
  | 'null'
  | 'integer';


export interface JsonSchema<T extends ItemModel, F extends JsonSchemaFormats = JsonSchemaFormats> {
  $ref?: string;
  $id?: string;
  $schema?: string;
  type?: JsonSchemaSimpleTypes | JsonSchemaSimpleTypes[];
  title?: string;
  description?: string;
  required?: (keyof T)[];

  primary?: boolean;
  default?: T;
  const?: T;

  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  maxLength?: number;
  minLength?: number;
  pattern?: string;

  additionalItems?: boolean | JsonSchema<T, F>;
  items?: JsonSchema<T, F> | JsonSchema<T, F>[];
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;

  // tslint:disable:no-any
  properties?: {[key in keyof T]: JsonSchemaProperty<T[key]> | JsonSchemaProperty<any>};
  maxProperties?: number;
  minProperties?: number;

  enum?: T[];
  format?: JsonSchemaFormats;
  allOf?: JsonSchema<T, F>[];
  anyOf?: JsonSchema<T, F>[];
  oneOf?: JsonSchema<T, F>[];
  not?: JsonSchema<T, F>;
}

export interface JsonSchemaProperty<T> {
  $ref?: string;
  $id?: string;
  $schema?: string;
  type?: JsonSchemaSimpleTypes | JsonSchemaSimpleTypes[];
  title?: string;
  description?: string;
  required?: (keyof T)[];

  primary?: boolean;
  default?: T;
  const?: T;

  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  maxLength?: number;
  minLength?: number;
  pattern?: string;

  additionalItems?: boolean | JsonSchemaProperty<T>;
  items?: JsonSchemaProperty<T> | JsonSchemaProperty<T>[];
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;

  // tslint:disable:no-any
  properties?: {[key: string]: JsonSchemaProperty<any>};
  maxProperties?: number;
  minProperties?: number;

  enum?: T[];
  format?: JsonSchemaFormats;
  allOf?: JsonSchemaProperty<T>[];
  anyOf?: JsonSchemaProperty<T>[];
  oneOf?: JsonSchemaProperty<T>[];
  not?: JsonSchemaProperty<T>;
}

