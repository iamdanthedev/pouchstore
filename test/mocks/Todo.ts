/**
 * Test todos model
 */
import { Collection, DB, Item, ItemModel } from '../../src';

import * as faker from 'faker';
import * as uuid from 'uuid';

export interface ITodo extends ItemModel {
  type: 'todo';
  id: string;
  title: string;
  desc: string;
}

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

