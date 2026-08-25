import { useState, useCallback } from 'react'
import { getMembershipPrice, isPremiumSub } from '../lib/engagement'
import { getStripePaymentLink, isStripeConfigured } from '../lib/stripeConfig'
import { startPremiumCheckout } from '../lib/checkout'
import { stashPendingStripe } from '../lib/tips'
import { redirectSafeUrl } from '../lib/safeUrl'

export function usePremiumCheckout({ user, isAuthenticated, creatorId, creatorHandle }) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const target = creatorId || user?.id
  const price = getMembershipPrice(target)
  const already = user && target ? isPremiumSub(user.id, target) : false
  const hasLink = !!getStripePaymentLink()
  const configured = isStripeConfigured()

  const pay = useCallback(async () => {
    if (!isAuthenticated || !target) {
      setStatus('Sign in first.')
      return
    }
    setBusy(true)
    stashPendingStripe({ kind: 'premium', donorId: user.id, handle: user.handle, creatorId: target })
    const result = await startPremiumCheckout({
      already,
      email: user?.email || '',
      reference: target,
    })
    setStatus(result.message)
    if (result.url) redirectSafeUrl(result.url)
    setBusy(false)
  }, [already, isAuthenticated, target, user])

  return {
    target,
    price,
    already,
    hasLink,
    configured,
    status,
    busy,
    pay,
    setStatus,
    label: creatorHandle ? `@${creatorHandle}` : 'this channel',
  }
}
