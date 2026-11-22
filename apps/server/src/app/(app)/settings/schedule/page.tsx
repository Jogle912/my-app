import { Suspense } from "react";
import { ActionForm, DaysField, Field, SelectField, SubmitButton } from "@/components/forms";
import { formatDays, formatLocal } from "@/lib/localTime";
import { systemClock } from "@studypilot/scheduler";
import { getPreferences, listAvailability, listEvents } from "@/server/access/schedule";
import { requireUser } from "@/server/access/session";
import { addAvailability, addEvent, deleteAvailability, deleteEvent, updatePreferences } from "../../actions";
import { ENERGY_OPTIONS } from "../../options";
import { Card, Loading, PageHeader } from "../../ui";

export const metadata = { title: "My week · StudyPilot" };

const ZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles",
  "America/Anchorage", "Pacific/Honolulu", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney",
];

async function Welcome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  if (!welcome) return null;
  return (
    <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
      Welcome! Start by adding the times you can usually study, then add your courses.
    </p>
  );
}

async function Schedule() {
  const user = await requireUser();
  const [prefs, rules, events] = await Promise.all([getPreferences(user.id), listAvailability(user.id), listEvents(user.id, systemClock.now())]);
  const zoneOptions = (ZONES.includes(prefs.timeZone) ? ZONES : [prefs.timeZone, ...ZONES]).map((z) => ({ value: z, label: z.replace("_", " ") }));
  const available = rules.filter((r) => r.kind === "AVAILABLE");
  const blocked = rules.filter((r) => r.kind === "BLOCKED");

  const ruleList = (list: typeof rules, empty: string) =>
    list.length === 0 ? (
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{empty}</p>
    ) : (
      <ul className="mb-4 flex flex-col gap-2">
        {list.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {r.label && <span className="font-medium">{r.label} · </span>}
              {formatDays(r.days)} · {r.startTime}–{r.endTime}
            </span>
            <ActionForm action={deleteAvailability.bind(null, r.id)} aria-label="Remove time block">
              <SubmitButton variant="danger">Remove</SubmitButton>
            </ActionForm>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="flex flex-col gap-6">
      <Card title="When can you study?">
        {ruleList(available, "No study times yet. The planner can't schedule anything until you add some.")}
        <ActionForm action={addAvailability} className="grid gap-4 sm:grid-cols-3" aria-label="Add study time">
          <input type="hidden" name="kind" value="AVAILABLE" />
          <div className="sm:col-span-3">
            <DaysField />
          </div>
          <Field label="From" name="startTime" type="time" required />
          <Field label="To" name="endTime" type="time" required />
          <Field label="Label (optional)" name="label" />
          <div className="sm:col-span-3">
            <SubmitButton>Add study time</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title="Regular commitments">
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Work shifts, practice, anything that repeats weekly. Classes go on each course page.</p>
        {ruleList(blocked, "None added.")}
        <ActionForm action={addAvailability} className="grid gap-4 sm:grid-cols-3" aria-label="Add a commitment">
          <input type="hidden" name="kind" value="BLOCKED" />
          <div className="sm:col-span-3">
            <DaysField />
          </div>
          <Field label="From" name="startTime" type="time" required />
          <Field label="To" name="endTime" type="time" required />
          <Field label="What is it?" name="label" />
          <div className="sm:col-span-3">
            <SubmitButton variant="secondary">Add commitment</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title="One-off busy times">
        {events.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">{e.title}</span> · {formatLocal(e.startAt, prefs.timeZone)} – {formatLocal(e.endAt, prefs.timeZone, "h:mm a")}
                </span>
                <ActionForm action={deleteEvent.bind(null, e.id)} aria-label="Remove busy time">
                  <SubmitButton variant="danger">Remove</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addEvent} className="grid gap-4 sm:grid-cols-3" aria-label="Add a busy time">
          <Field label="What" name="title" required />
          <Field label="Starts" name="startAt" type="datetime-local" required />
          <Field label="Ends" name="endAt" type="datetime-local" required />
          <div className="sm:col-span-3">
            <SubmitButton variant="secondary">Add busy time</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title="Preferences">
        <ActionForm action={updatePreferences} className="grid gap-4 sm:grid-cols-3" aria-label="Preferences">
          <SelectField label="Time zone" name="timeZone" options={zoneOptions} defaultValue={prefs.timeZone} />
          <Field label="Bedtime" name="sleepStart" type="time" defaultValue={prefs.sleepStart} required />
          <Field label="Wake up" name="sleepEnd" type="time" defaultValue={prefs.sleepEnd} required />
          <Field label="Max study minutes per day" name="maxStudyMinutesPerDay" type="number" min={15} max={960} step={15} defaultValue={prefs.maxStudyMinutesPerDay} />
          <Field label="Preferred session length (min)" name="preferredSessionMinutes" type="number" min={15} max={240} step={5} defaultValue={prefs.preferredSessionMinutes} />
          <Field label="Shortest useful session (min)" name="minSessionMinutes" type="number" min={10} max={120} step={5} defaultValue={prefs.minSessionMinutes} />
          <Field label="Break between sessions (min)" name="breakMinutes" type="number" min={0} max={60} step={5} defaultValue={prefs.breakMinutes} />
          <Field label="Finish this many hours early" name="deadlineBufferHours" type="number" min={0} max={168} defaultValue={prefs.deadlineBufferHours} hint="Safety buffer before deadlines." />
          <div />
          <SelectField label="Morning energy" name="energyMorning" options={ENERGY_OPTIONS} defaultValue={String(prefs.energyMorning)} />
          <SelectField label="Afternoon energy" name="energyAfternoon" options={ENERGY_OPTIONS} defaultValue={String(prefs.energyAfternoon)} />
          <SelectField label="Evening energy" name="energyEvening" options={ENERGY_OPTIONS} defaultValue={String(prefs.energyEvening)} />
          <div className="sm:col-span-3">
            <SubmitButton>Save preferences</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}

export default function SchedulePage({ searchParams }: PageProps<"/settings/schedule">) {
  return (
    <>
      <PageHeader title="My week">The planner only schedules study inside these times, around your commitments.</PageHeader>
      <Suspense fallback={null}>
        <Welcome searchParams={searchParams as Promise<{ welcome?: string }>} />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <Schedule />
      </Suspense>
    </>
  );
}
