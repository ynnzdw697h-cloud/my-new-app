import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { SkeletonList } from '../ui';
import { useFirestoreDoc } from '../../hooks/useFirestoreDoc';
import { useAdminClaim } from '../../hooks/useAdminClaim';
import { ADMIN_DOCS, PUBLIC_DOCS, defaultTemplate, nextWeekStart, weekStartOf, weekLabel } from '../../data/schedule';
import { addDays } from '../../data/shifts';
import { useWeekAvailability } from '../../hooks/useWeekAvailability';
import ScheduleBoard from './ScheduleBoard';
import ChefProfiles from './ChefProfiles';
import StaffingTemplate from './StaffingTemplate';
import Submissions from './Submissions';
import { Tabs, NoAccess } from './parts';

const TABS = [
  { id: 'board',    label: 'לוח שיבוץ' },
  { id: 'submissions', label: 'הגשות' },
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
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {denied ? <NoAccess />
        : loading ? <SkeletonList />
        : tab === 'cooks' ? <ChefProfiles profiles={profiles} setProfiles={setProfiles} />
        : tab === 'submissions' ? <><WeekPicker week={week} setWeek={setWeek} /><Submissions week={week} deadline={deadline} /></>
        : tab === 'template' ? <StaffingTemplate template={template} setTemplate={setTemplate} />
        : <><WeekPicker week={week} setWeek={setWeek} /><ScheduleBoard key={week} week={week} template={template?.days ? template : defaultTemplate()} profiles={profiles || {}} availability={availability} availabilityLoaded={availabilityLoaded} /></>}
    </>
  );
}

// ‹ שבוע 6.12–12.12 › — from this week up to 4 weeks ahead
function WeekPicker({ week, setWeek }) {
  const first = weekStartOf();
  const last = addDays(first, 28);
  const btn = 'w-12 h-12 rounded-xl flex items-center justify-center text-text-primary transition-colors duration-150 active:bg-white/10 disabled:opacity-30';
  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" className={btn} style={{ border: '1px solid var(--border)' }} disabled={week <= first} onClick={() => setWeek(addDays(week, -7))} aria-label="שבוע קודם">
        <ChevronRight size={22} strokeWidth={1.75} />
      </button>
      <span className="text-h3 text-text-primary">שבוע <span className="tabular-nums" dir="ltr">{weekLabel(week)}</span></span>
      <button type="button" className={btn} style={{ border: '1px solid var(--border)' }} disabled={week >= last} onClick={() => setWeek(addDays(week, 7))} aria-label="שבוע הבא">
        <ChevronLeft size={22} strokeWidth={1.75} />
      </button>
    </div>
  );
}
