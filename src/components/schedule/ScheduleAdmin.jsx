import { useEffect, useState } from 'react';
import { SkeletonList } from '../ui';
import { useFirestoreDoc } from '../../hooks/useFirestoreDoc';
import { useAdminClaim } from '../../hooks/useAdminClaim';
import { ADMIN_DOCS, PUBLIC_DOCS, defaultTemplate, nextWeekStart } from '../../data/schedule';
import { useWeekAvailability } from '../../hooks/useWeekAvailability';
import ScheduleBoard from './ScheduleBoard';
import ChefProfiles from './ChefProfiles';
import TeamManager from './TeamManager';
import StaffingTemplate from './StaffingTemplate';
import Submissions from './Submissions';
import { Tabs, NoAccess, WeekPicker } from './parts';

const TABS = [
  { id: 'board',    label: 'לוח שיבוץ' },
  { id: 'submissions', label: 'הגשות' },
  { id: 'cooks',    label: 'טבחים' },
  { id: 'template', label: 'כוח אדם' },
  { id: 'team',    label: 'צוות' },
];

// Only the board uses the full width on a computer; the other tabs stay a readable column.
const NARROW = 'max-w-3xl mx-auto space-y-4';

// "סידור עבודה" — managers only (דורון, קידר).
// Nothing under tenantsAdmin/ is requested until the login token proves the user is a manager.
export default function ScheduleAdmin() {
  const isAdmin = useAdminClaim();
  return (
    <div className="p-5 md:p-6 space-y-5 max-w-3xl lg:max-w-[1600px] mx-auto" dir="rtl">
      {isAdmin === 'loading' ? <SkeletonList />
        : isAdmin ? <ScheduleAdminInner />
        : <NoAccess />}
    </div>
  );
}

function ScheduleAdminInner() {
  const [tab, setTab] = useState('board');
  const [week, setWeek] = useState(() => nextWeekStart());
  const { availability, loaded: availabilityLoaded } = useWeekAvailability(week);
  const [profiles, setProfiles, profilesState] = useFirestoreDoc(ADMIN_DOCS.profiles, {}, 'admin');
  const [template, setTemplate, templateState] = useFirestoreDoc(ADMIN_DOCS.template, defaultTemplate(), 'admin');

  // Cooks can't read the manager template, so the deadline is copied to a public doc they can read.
  const [settings, setSettings, settingsState] = useFirestoreDoc(PUBLIC_DOCS.settings, null);
  const deadline = template?.deadline || defaultTemplate().deadline;
  useEffect(() => {
    if (!templateState.loaded || !settingsState.loaded || templateState.error) return;
    if (JSON.stringify(settings?.deadline) !== JSON.stringify(deadline)) setSettings({ deadline });
  }, [templateState.loaded, templateState.error, settingsState.loaded, settings, deadline, setSettings]);

  const denied  = profilesState.error === 'permission-denied' || templateState.error === 'permission-denied';
  const loading = !profilesState.loaded || !templateState.loaded;

  return (
    <>
      {/* On a computer the week arrows sit beside the tabs, so the board fits on one screen */}
      <div className={tab === 'board' ? 'space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-6' : NARROW}>
        <div className={tab === 'board' ? 'lg:flex-1 lg:max-w-3xl' : ''}><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>
        {tab === 'board' && !denied && !loading && <div className="lg:w-[380px]"><WeekPicker week={week} setWeek={setWeek} /></div>}
      </div>
      {denied ? <NoAccess />
        : loading ? <SkeletonList />
        : tab === 'cooks' ? <div className={NARROW}><ChefProfiles profiles={profiles} setProfiles={setProfiles} /></div>
        : tab === 'submissions' ? <div className={NARROW}><WeekPicker week={week} setWeek={setWeek} /><Submissions week={week} deadline={deadline} /></div>
        : tab === 'team' ? <div className={NARROW}><TeamManager /></div>
        : tab === 'template' ? <div className={NARROW}><StaffingTemplate template={template} setTemplate={setTemplate} /></div>
        : <><ScheduleBoard key={week} week={week} template={template?.days ? template : defaultTemplate()} profiles={profiles || {}} availability={availability} availabilityLoaded={availabilityLoaded} /></>}
    </>
  );
}

