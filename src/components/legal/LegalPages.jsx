function LegalShell({ title, children }) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">{title}</h1>
      <article className="space-y-4 text-sm text-slate-600 leading-relaxed [&_h2]:text-slate-900 [&_h2]:font-semibold [&_h2]:text-sm [&_h2]:mt-6 [&_h2]:mb-2">
        {children}
      </article>
    </div>
  )
}

export function TermsOfService() {
  return (
    <LegalShell title="Terms of Service">
      <p>Last updated: August 22, 2026</p>
      <h2>1. Acceptance</h2>
      <p>By accessing or using Clips you agree to these Terms. If you do not agree, do not use the service.</p>
      <h2>2. Accounts</h2>
      <p>You are responsible for your account credentials and activity. You must meet the minimum age in your jurisdiction (generally 13+).</p>
      <h2>3. Content</h2>
      <p>You retain ownership of content you upload. You grant Clips a limited license to host, transcode, and distribute that content on the service. You represent you have all rights needed to post it.</p>
      <h2>4. Prohibited conduct</h2>
      <p>No illegal content, malware, spam, or material that violates these Terms or applicable law. We may remove content and suspend accounts that violate these rules.</p>
      <h2>5. Copyright</h2>
      <p>Clips operates a notice-and-takedown process under the DMCA. See Settings → Copyright &amp; DMCA for intake addresses, strike policy, and counter-notification procedures.</p>
      <h2>6. Monetization</h2>
      <p>Subscription revenue is paid 100% to creators (processing fees charged on top to buyers). Ad revenue is shared 90% to creators by verified impression share and 10% retained by the platform, subject to eligibility and policy compliance.</p>
      <h2>7. Disclaimers</h2>
      <p>The service is provided “as is.” To the fullest extent permitted by law, Clips disclaims warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
      <h2>8. Limitation of liability</h2>
      <p>To the fullest extent permitted by law, Clips is not liable for indirect, incidental, special, or consequential damages arising from use of the service.</p>
      <h2>9. Changes</h2>
      <p>We may update these Terms. Continued use after changes constitutes acceptance of the revised Terms.</p>
      <h2>10. Contact</h2>
      <p>Legal inquiries: legal@platform.internal</p>
    </LegalShell>
  )
}

export function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy">
      <p>Last updated: August 22, 2026</p>
      <h2>1. Data we collect</h2>
      <p>Account data, content and import metadata, usage signals for recommendations, and technical logs required to operate the service.</p>
      <h2>2. How we use data</h2>
      <p>To provide the product, personalize discovery, process payouts, enforce policies, and improve reliability. Follower count is not used as a ranking feature.</p>
      <h2>3. Storage</h2>
      <p>MVP sessions and taste profiles may be stored locally in your browser until a backend is connected. We do not sell personal data.</p>
      <h2>4. Sharing</h2>
      <p>We share data with service providers only as needed to operate the platform, or when required by law.</p>
      <h2>5. Your rights</h2>
      <p>You may request access, correction, export, or deletion via Settings → Security. Regional rights apply where required by law.</p>
      <h2>6. Contact</h2>
      <p>Privacy: privacy@platform.internal</p>
    </LegalShell>
  )
}

export function CreatorAgreement() {
  return (
    <LegalShell title="Creator Agreement">
      <p>Last updated: August 22, 2026</p>
      <h2>1. Revenue</h2>
      <p>Subscriptions and tips: 100% of the listed price is paid to the creator. Processing fees are charged on top to the buyer.</p>
      <p>Advertising: 90% of the aggregated ad pool is distributed to eligible creators by verified impression share; 10% is retained by the platform.</p>
      <h2>2. Eligibility</h2>
      <p>Monetization may require identity verification, minimum activity, and compliance with Community Guidelines and copyright policy.</p>
      <h2>3. Content license</h2>
      <p>You grant Clips a non-exclusive license to host and deliver your content on the service.</p>
      <h2>4. Taxes</h2>
      <p>You are responsible for taxes on amounts you receive.</p>
    </LegalShell>
  )
}

export function CommunityGuidelines() {
  return (
    <LegalShell title="Community Guidelines">
      <p>Last updated: August 22, 2026</p>
      <h2>Be real</h2>
      <p>Do not impersonate others or misrepresent the origin of content when it matters for safety or rights.</p>
      <h2>Respect the law</h2>
      <p>No illegal content, exploitation, or threats. Copyright claims follow our DMCA process.</p>
      <h2>Keep chat usable</h2>
      <p>No spam, coordinated harassment, or malware links.</p>
      <h2>Discovery integrity</h2>
      <p>Do not manipulate engagement signals with bots or artificial traffic.</p>
    </LegalShell>
  )
}
