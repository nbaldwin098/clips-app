import { allocatePublicId } from './publicId.js'
import { getImports } from './storage.js'

function idTaken(id) {
  if (!id) return true
  const imports = getImports()
  if (imports.some((r) => r?.id === id)) return true
  return false
}

/** New post primary key — opaque calabi.us/<id> share token. */
export function newContentId() {
  return allocatePublicId(idTaken)
}
