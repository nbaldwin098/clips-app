import sitePromos from '../../supabase/migrations/0005_site_promos.sql?raw'
import socialGraph from '../../supabase/migrations/0006_social_graph.sql?raw'
import purgeDead from '../../supabase/migrations/0007_purge_dead_media.sql?raw'
import purgeDead2 from '../../supabase/migrations/0008_purge_dead_media.sql?raw'
import namedActivity from '../../supabase/migrations/0009_named_activity.sql?raw'
import stopNamedActivity from '../../supabase/migrations/0010_stop_named_activity.sql?raw'
import showAdsLiveChat from '../../supabase/migrations/0011_show_ads_live_chat.sql?raw'
import videosPublishColumns from '../../supabase/migrations/0012_videos_publish_columns.sql?raw'
import liveFeatureState from '../../supabase/migrations/0013_live_feature_state.sql?raw'

export const SETUP_SCRIPTS = [
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
]
