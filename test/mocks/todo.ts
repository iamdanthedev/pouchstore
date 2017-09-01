import { ItemModel } from '../../src'

import * as faker from 'faker'

const uuid = require('uuid')

export
interface ITodo extends ItemModel {
  type: 'todo'
  id: string
  title: string
  desc: string
}

export
function TodoValidator(data: Partial<ITodo>): ITodo {
  return {
    type: 'todo',
    id: data.id || uuid(),
    title: data.title || 'New Todo Item',
    desc: data.desc || '',
  }
}

export function genTodos(num: number): ITodo[]
{
  return [...Array(num).keys()].map((v) => ({
      type: 'todo',
      id: uuid(),
      title: faker.lorem.sentence(),
      desc: faker.lorem.sentences(40),
    } as ITodo)
  )
}

export const todos = genTodos(500);
