/** Fisher–Yates shuffle for feed variety (new order each call). */
export function shuffleFeed(items) {
  const arr = [...(items || [])]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
