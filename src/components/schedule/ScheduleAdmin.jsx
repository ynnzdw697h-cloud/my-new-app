import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { EmptyState, SkeletonList } from '../ui';
import { useFirestoreDoc } from '../../hooks/useFirestoreDoc';
import { useAdminClaim } from '../../hooks/useAdminClaim';
import { ADMIN_DOCS, defaultTemplate } from '../../data/schedule';
import ChefProfiles from './ChefProfiles';
import StaffingTemplate from './StaffingTemplate';
import { Tabs, NoAccess } from './parts';

const TABS = [
  { id: 'board',    label: 'לוח שיבוץ' },
  { id: 'cooks',    label: 'טבחים' },
  { id: 'template', label: 'כוח אדם' },
];

// "סידור עבודה" — managers only (דורון, קידר).
// Nothing under tenantsAdmin/ is requested until the login token proves the user is a manager.
export default function ScheduleAdmin() {
  const isAdmin = useAdminClaim();
  return (
    <div className="p-5 md:p-6 space-y-5 max-w-3xl mx-auto" dir="rtl">
      {isAdmin === 'loading' ? <SkeletonList />
        : isAdmin ? <ScheduleAdminInner />
        : <NoAccess />}
    </div>
  );
}

function ScheduleAdminInner() {
  const [tab, setTab] = useState('cooks');
  const [profiles, setProfiles, profilesState] = useFirestoreDoc(ADMIN_DOCS.profiles, {}, 'admin');
  const [template, setTemplate, templateState] = useFirestoreDoc(ADMIN_DOCS.template, defaultTemplate(), 'admin');

  const denied  = profilesState.error === 'permission-denied' || templateState.error === 'permission-denied';
  const loading = !profilesState.loaded || !templateState.loaded;

  return (
    <>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {denied ? <NoAccess />
        : loading ? <SkeletonList />
        : tab === 'cooks' ? <ChefProfiles profiles={profiles} setProfiles={setProfiles} />
        : tab === 'template' ? <StaffingTemplate template={template} setTemplate={setTemplate} />
        : <EmptyState icon={CalendarDays} title="לוח השיבוץ" description="בשלב הבא. קודם ממלאים את כרטיסי הטבחים ואת כוח האדם." />}
    </>
  );
}
