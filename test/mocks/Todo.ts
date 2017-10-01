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
  tags: string[];
  params: {
    color: string;
    checked: boolean;
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

    tags: {
      type: 'array',
      default: [],
      index: true,
      items: {
        type: 'string'
      }
    },

    params: {
      type: 'object',
      properties: {
        color: {
          type: 'string',
          index: true
        },

        checked: {
          type: 'boolean',
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

  get tags(): string[] {
    return this.getProp('tags');
  }
}

export const todoTags = [
  'hi',
  'hello',
  'slim',
  'shady',
  'work',
  'leisure',
  'ginger',
  'cooking'
]

export function genTodos(num: number): ITodo[] {
  return [...Array(num).keys()].map(v => ({
      type: 'todo',
      id: uuid(),
      title: faker.lorem.sentence().slice(0, 99),
      desc: faker.lorem.sentences(40),
      counter: faker.random.number(5),
      tags: faker.helpers.shuffle(todoTags).slice(0, faker.random.number(todoTags.length - 1)),
      params: {
        color: ['red', 'green', 'white', 'blue'][faker.random.number(3)],
        checked: faker.random.boolean()
      }
    } as ITodo)
  );
}

export const todos = genTodos(500);
