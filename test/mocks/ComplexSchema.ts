/**
 * Complex schema test
 */
import { JsonSchema } from '../../src/JsonSchema';

interface Recipe {
  type: 'recipe';
  title: string;
  ingredients: Ingredient[];
  author: Author;
}

interface Ingredient {
  title: string;
}

interface Author {
  name: string;
  age: number;
}

const recipeSchema: JsonSchema<Recipe> = {

  $id: 'recipe.json',
  required: ['type', 'title', 'ingredients', 'author'],

  properties: {

    type: {
      type: 'string',
      const: 'recipe',
    },

    title: {
      type: 'string',
    },

    ingredients: {
      type: 'array',
      items: {
        required: ['title'],
        properties: {
          title: {
            type: 'string'
          }
        }
      },
      default: [],
    },

    author: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      }
    }
  }
};
