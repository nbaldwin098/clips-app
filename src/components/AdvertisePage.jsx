import { useState } from 'react'
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  LogIn,
  Sparkles,
} from 'lucide-react'
import { submitAdApplication } from '../lib/adEngine'
import PageHeader from './PageHeader'

const inputCls =
  'mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white focus:outline-none'

export default function AdvertisePage({ onNavigate }) {
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [targetAudience, setTargetAudience] = useState('gaming')
  const [monthlyBudget, setMonthlyBudget] = useState('$500 - $2,500')
  const [campaignGoals, setCampaignGoals] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    submitAdApplication({
      businessName,
      contactName,
      email,
      phone,
      website,
      targetAudience,
      monthlyBudget,
      campaignGoals,
    })
    setSubmitted(true)
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Advertise on calabi"
        onBack={() => onNavigate?.('home')}
        actions={
          <button
            type="button"
            onClick={() => onNavigate?.('advertiser-portal')}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all"
          >
            <LogIn className="h-3.5 w-3.5" /> Advertiser Portal Login
          </button>
        }
      />

      {/* Hero Banner */}
      <div className="relative rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#181824] via-[#121218] to-[#0d0d12] p-6 sm:p-8 overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-white" /> Brand applications — reviewed by a person
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Advertise next to real videos, not invented traffic
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Inventory today is skippable preroll on videos, plus short-video and pic banners and in-feed tiles, after we approve your brand. There is no live CPM, no guaranteed 24-hour turnaround, and no ad-revenue share until an ad pool actually exists. We will not sell you fake reach.
          </p>
        </div>
      </div>

      {/* Business Procedures & Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-2">
          <div className="h-9 w-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">1</div>
          <h3 className="text-sm font-semibold text-white">Apply</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Send company, contact, and what you want to run. We read it. Approval is not automatic and is not promised in 24 hours.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-2">
          <div className="h-9 w-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">2</div>
          <h3 className="text-sm font-semibold text-white">Portal after approval</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            If we approve you, we create a portal login so you can set creatives. Unapproved brands cannot buy a slot from this form.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-2">
          <div className="h-9 w-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">3</div>
          <h3 className="text-sm font-semibold text-white">Placement</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Approved campaigns can show skippable preroll on videos, a banner at the bottom of a short video or photo, and tiles between short videos or photos as people scroll. Counts are impressions and clicks we actually record — not a sold audience number.
          </p>
        </div>
      </div>

      {/* Form or Confirmation */}
      {submitted ? (
        <div className="rounded-3xl border border-emerald-500/30 bg-[#121815] p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Advertisement Application Received!</h2>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              Our partner operations team is reviewing your business submission. Upon approval, your credentials will be activated to log into the Advertiser Portal.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate?.('advertiser-portal')}
              className="h-10 px-5 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200"
            >
              Go to Advertiser Portal
            </button>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="h-10 px-4 rounded-xl border border-zinc-800 bg-[#14141c] text-xs text-zinc-300"
            >
              Submit another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-3xl border border-zinc-800 bg-[#121218] p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-white" /> Business Information & Placement Request
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Provide your organization details. We review and approve all advertising partners.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold text-zinc-200">
              Company / Business Name *
              <input
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Inc."
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-200">
              Contact Full Name *
              <input
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Doe"
                className={inputCls}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block text-xs font-semibold text-zinc-200">
              Business Email *
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@company.com"
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-200">
              Phone Number
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-200">
              Website / App URL *
              <input
                required
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.com"
                className={inputCls}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold text-zinc-200">
              Primary Target Audience
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className={inputCls}
              >
                <option value="gaming">Gaming & Esports</option>
                <option value="irl">IRL & Lifestyle</option>
                <option value="tech">Tech & Software</option>
                <option value="music">Music & Entertainment</option>
                <option value="all">All Viewers (Broad Reach)</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-zinc-200">
              Estimated Monthly Ad Budget
              <select
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className={inputCls}
              >
                <option value="$250 - $500">$250 - $500 / month</option>
                <option value="$500 - $2,500">$500 - $2,500 / month</option>
                <option value="$2,500 - $10,000">$2,500 - $10,000 / month</option>
                <option value="$10,000+">$10,000+ / month (Enterprise)</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold text-zinc-200">
            Campaign Goals & Creative Overview
            <textarea
              value={campaignGoals}
              onChange={(e) => setCampaignGoals(e.target.value)}
              rows={3}
              placeholder="Tell us what product or service you're promoting, call to action, and any specific format preferences."
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#000000] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white focus:outline-none"
            />
          </label>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            Submit Advertising Application <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  )
}
