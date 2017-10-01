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
  params: {
    param1: string;
  }
}

export const todoSchema: JsonSchema<ITodo> = {
  $id: 'http://github.com/rasdaniil/pouchstore/schema/todo.json#',
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
      index: true,
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
    },

    params: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          index: true
        }
      }
    }

  },
};

export const todoSchema2: JsonSchema<ITodo> = Object.assign({}, todoSchema, {
  $id: 'http://github.com/rasdaniil/pouchstore/schema/todo2.json#',
});

export class Todo extends Item<ITodo> {

  get id(): string {
    return this.getProp('id');
  }

  get title(): string {
    return this.getProp('title');
  }

  get desc(): string {
    return this.getProp('desc');
  }
}


export function genTodos(num: number): ITodo[] {
  return [...Array(num).keys()].map(v => ({
      type: 'todo',
      id: uuid(),
      title: faker.lorem.sentence().slice(0, 99),
      desc: faker.lorem.sentences(40),
    } as ITodo)
  );
}

export const todos = genTodos(500);
