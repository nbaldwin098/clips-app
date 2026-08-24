import sitePromos from '../../supabase/migrations/0005_site_promos.sql?raw'
import socialGraph from '../../supabase/migrations/0006_social_graph.sql?raw'
import purgeDead from '../../supabase/migrations/0007_purge_dead_media.sql?raw'
import purgeDead2 from '../../supabase/migrations/0008_purge_dead_media.sql?raw'
import namedActivity from '../../supabase/migrations/0009_named_activity.sql?raw'

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
    title: 'Named people activity job',
    file: '0009_named_activity.sql',
    sql: String(namedActivity || ''),
  },
]
