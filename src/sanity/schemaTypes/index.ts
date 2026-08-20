import { type SchemaTypeDefinition } from 'sanity'

// export const schema: { types: SchemaTypeDefinition[] } = {
//   types: [],
// }

import {artworkType} from './artwork'

export const schemaTypes = [
  artworkType,
]