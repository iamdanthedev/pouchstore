import { ItemModel } from './../..'

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

export 
const todos: ITodo[] = [...Array(500).keys()].map((v) => {

    const todo: ITodo = {
        type: 'todo',
        id: uuid(),
        title: faker.lorem.sentence(),
		desc: faker.lorem.sentences(40),
    }

    return todo

})
