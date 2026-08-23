import { useEffect, useState } from 'react'
import { subscribeContentUpdates } from './contentSync'

/**
 * Returns a counter that increments whenever the local content cache
 * changes (a publish on this device, or a cloud sync merging in content
 * from other devices/users). Add it to a useMemo's dependency array to
 * keep a feed's read in sync without requiring a full page remount.
 */
export function useContentSyncTick() {
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeContentUpdates(() => setTick((t) => t + 1)), [])
  return tick
}
