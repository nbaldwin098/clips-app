import { useEffect, useState } from 'react'
import { formatPostedAt, formatPostedExact, postedAtOf } from '../lib/mediaMeta'

export default function PostedStamp({ item, at, className = '' }) {
  const stamp = at || postedAtOf(item)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!stamp) return undefined
    const id = setInterval(() => setTick((n) => n + 1), 20_000)
    return () => clearInterval(id)
  }, [stamp])
  if (!stamp) return null
  return (
    <time dateTime={stamp} title={formatPostedExact(stamp)} className={className}>
      {formatPostedAt(stamp)}
    </time>
  )
}
