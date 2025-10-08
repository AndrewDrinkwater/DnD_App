// src/utils/idGenerator.js
export function newId(prefix = 'id') {
  const unique = Math.random().toString(36).substring(2, 10)
  return `${prefix}_${unique}`
}
