// src/utils/storage.js
export function readStoredState(key, fallback) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch (err) {
    console.error('Error reading storage:', err)
    return fallback
  }
}

export function writeStoredState(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('Error writing storage:', err)
  }
}
