/**
 * Test todos model
 */
import { Item, ItemModel } from '../../src';

import * as faker from 'faker';
import * as uuid from 'uuid';
import { JsonSchema } from '../../src/JsonSchema';

export interface ITodo extends ItemModel {
  type: 'todo';
  id: string;
  title: string;
  desc: string;
  counter: number;
}

export const todoSchema: JsonSchema<ITodo> = {
  $id: 'http://github.com/rasdaniil/pouchstore/test#todo',
  type: 'object',
  required: ['type', 'id', 'title'],
  properties: {

    type: {
      type: 'string',
      const: 'todo',
    },

    id: {
      type: 'string',
      format: 'uuid',
      primary: true,
    },

    title: {
      type: 'string',
      maxLength: 100,
    },

    desc: {
      type: 'string',
      default: 'n/a',
    },

    counter: {
      type: 'number',
      default: 5,
      maximum: 50,
    }

  },
};

export class Todo extends Item<ITodo> {

  get id(): string {
    return this._doc.id;
  }

  get title(): string {
    return this._doc.title;
  }

  get desc(): string {
    return this._doc.desc;
  }
}


export function todoValidator(data: Partial<ITodo>): ITodo {
  return {
    type: 'todo',
    id: data.id || uuid(),
    title: data.title || 'New Todo Item',
    desc: data.desc || '',
    counter: 0
  };
}

export function genTodos(num: number): ITodo[] {
  return [...Array(num).keys()].map(v => ({
      type: 'todo',
      id: uuid(),
      title: faker.lorem.sentence(),
      desc: faker.lorem.sentences(40),
    } as ITodo)
  );
}

export const todos = genTodos(500);
