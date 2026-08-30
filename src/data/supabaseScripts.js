import videosTable from '../../supabase/migrations/0001_videos_table.sql?raw'
import watchProgress from '../../supabase/migrations/0002_watch_progress_table.sql?raw'
import clipsStorage from '../../supabase/migrations/0003_clips_storage_bucket.sql?raw'
import profiles from '../../supabase/migrations/0004_profiles.sql?raw'
import sitePromos from '../../supabase/migrations/0005_site_promos.sql?raw'
import socialGraph from '../../supabase/migrations/0006_social_graph.sql?raw'
import purgeDead from '../../supabase/migrations/0007_purge_dead_media.sql?raw'
import purgeDead2 from '../../supabase/migrations/0008_purge_dead_media.sql?raw'
import namedActivity from '../../supabase/migrations/0009_named_activity.sql?raw'
import stopNamedActivity from '../../supabase/migrations/0010_stop_named_activity.sql?raw'
import showAdsLiveChat from '../../supabase/migrations/0011_show_ads_live_chat.sql?raw'
import videosPublishColumns from '../../supabase/migrations/0012_videos_publish_columns.sql?raw'
import liveFeatureState from '../../supabase/migrations/0013_live_feature_state.sql?raw'
import creatorInteractions from '../../supabase/migrations/0014_creator_interactions.sql?raw'
import videosFirstPublished from '../../supabase/migrations/0015_videos_first_published_at.sql?raw'
import platformEconomy from '../../supabase/migrations/0016_platform_economy.sql?raw'
import globalLiveChat from '../../supabase/migrations/0017_global_live_chat.sql?raw'
import supportMarketplace from '../../supabase/migrations/0018_support_marketplace.sql?raw'
import siteNews from '../../supabase/migrations/0019_site_news.sql?raw'
import uniqueViews from '../../supabase/migrations/0020_unique_content_views.sql?raw'
import visibilityPayoutSecrets from '../../supabase/migrations/0021_visibility_payout_secrets.sql?raw'
import directMessages from '../../supabase/migrations/0022_direct_messages.sql?raw'
import connectPushScaffolds from '../../supabase/migrations/0023_connect_push_scaffolds.sql?raw'
import stripeConnect from '../../supabase/migrations/0024_stripe_connect.sql?raw'
import cloudflareLiveInputs from '../../supabase/migrations/0025_cloudflare_live_inputs.sql?raw'
import liveLobbyIngest from '../../supabase/migrations/0026_live_lobby_ingest.sql?raw'
import videosVisibilityRls from '../../supabase/migrations/0027_videos_visibility_rls_storage.sql?raw'
import videosRlsAudit from '../../supabase/migrations/0028_videos_rls_storage_audit.sql?raw'
import clipsBucketLimits from '../../supabase/migrations/0029_clips_bucket_limits.sql?raw'

/** Run in order. 0001–0004 are required before anything that references profiles. */
export const SETUP_SCRIPTS = [
  {
    id: '0001',
    title: 'Videos / clips / pics catalog (required first)',
    file: '0001_videos_table.sql',
    sql: String(videosTable || ''),
  },
  {
    id: '0002',
    title: 'Watch progress (cross-device resume)',
    file: '0002_watch_progress_table.sql',
    sql: String(watchProgress || ''),
  },
  {
    id: '0003',
    title: 'Storage bucket "clips" (uploads)',
    file: '0003_clips_storage_bucket.sql',
    sql: String(clipsStorage || ''),
  },
  {
    id: '0004',
    title: 'Profiles table (required — fixes "profiles does not exist")',
    file: '0004_profiles.sql',
    sql: String(profiles || ''),
  },
  {
    id: '0005',
    title: 'Site banners',
    file: '0005_site_promos.sql',
    sql: String(sitePromos || ''),
  },
  {
    id: '0006',
    title: 'Follows and comments',
    file: '0006_social_graph.sql',
    sql: String(socialGraph || ''),
  },
  {
    id: '0007',
    title: 'Delete broken pics',
    file: '0007_purge_dead_media.sql',
    sql: String(purgeDead || ''),
  },
  {
    id: '0008',
    title: 'Delete leftover broken clips and pics',
    file: '0008_purge_dead_media.sql',
    sql: String(purgeDead2 || ''),
  },
  {
    id: '0009',
    title: 'Named people table (do not re-run the cron part)',
    file: '0009_named_activity.sql',
    sql: String(namedActivity || ''),
  },
  {
    id: '0010',
    title: 'Stop named-account bots',
    file: '0010_stop_named_activity.sql',
    sql: String(stopNamedActivity || ''),
  },
  {
    id: '0011',
    title: 'Ad prefs + live chat sync',
    file: '0011_show_ads_live_chat.sql',
    sql: String(showAdsLiveChat || ''),
  },
  {
    id: '0012',
    title: 'Upload publish columns (fixes "Couldn\'t upload")',
    file: '0012_videos_publish_columns.sql',
    sql: String(videosPublishColumns || ''),
  },
  {
    id: '0013',
    title: 'Live pools / challenges / group sync',
    file: '0013_live_feature_state.sql',
    sql: String(liveFeatureState || ''),
  },
  {
    id: '0014',
    title: 'Creator interaction map (bubble events)',
    file: '0014_creator_interactions.sql',
    sql: String(creatorInteractions || ''),
  },
  {
    id: '0015',
    title: 'Immutable first-publish timestamps',
    file: '0015_videos_first_published_at.sql',
    sql: String(videosFirstPublished || ''),
  },
  {
    id: '0016',
    title: 'Platform economy (coins, earnings, views, premium, vote tallies)',
    file: '0016_platform_economy.sql',
    sql: String(platformEconomy || ''),
  },
  {
    id: '0017',
    title: 'Global live lobby chat',
    file: '0017_global_live_chat.sql',
    sql: String(globalLiveChat || ''),
  },
  {
    id: '0018',
    title: 'Support tickets + marketplace (sellers, products, orders)',
    file: '0018_support_marketplace.sql',
    sql: String(supportMarketplace || ''),
  },
  {
    id: '0019',
    title: 'Site News feed (left-menu News tab)',
    file: '0019_site_news.sql',
    sql: String(siteNews || ''),
  },
  {
    id: '0020',
    title: 'Unique content views (by viewer / IP — stops rewatch inflation)',
    file: '0020_unique_content_views.sql',
    sql: String(uniqueViews || ''),
  },
  {
    id: '0021',
    title: 'Visibility + payout secrets (RLS)',
    file: '0021_visibility_payout_secrets.sql',
    sql: String(visibilityPayoutSecrets || ''),
  },
  {
    id: '0022',
    title: 'Direct messages (participants-only RLS)',
    file: '0022_direct_messages.sql',
    sql: String(directMessages || ''),
  },
  {
    id: '0023',
    title: 'Stripe Connect account id + push_subscriptions',
    file: '0023_connect_push_scaffolds.sql',
    sql: String(connectPushScaffolds || ''),
  },
  {
    id: '0024',
    title: 'Stripe Connect status + settlements + transfers',
    file: '0024_stripe_connect.sql',
    sql: String(stripeConnect || ''),
  },
  {
    id: '0025',
    title: 'Cloudflare Stream live inputs (owner-read RLS)',
    file: '0025_cloudflare_live_inputs.sql',
    sql: String(cloudflareLiveInputs || ''),
  },
  {
    id: '0026',
    title: 'Live lobby HLS / ingest columns',
    file: '0026_live_lobby_ingest.sql',
    sql: String(liveLobbyIngest || ''),
  },
  {
    id: '0027',
    title: 'Videos visibility RLS + clips storage re-assert',
    file: '0027_videos_visibility_rls_storage.sql',
    sql: String(videosVisibilityRls || ''),
  },
  {
    id: '0028',
    title: 'Videos/storage RLS audit (WITH CHECK, admin delete, unlisted RPC)',
    file: '0028_videos_rls_storage_audit.sql',
    sql: String(videosRlsAudit || ''),
  },
  {
    id: '0029',
    title: 'clips bucket size + MIME allowlist (run in SQL editor)',
    file: '0029_clips_bucket_limits.sql',
    sql: String(clipsBucketLimits || ''),
  },
]
