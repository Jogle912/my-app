import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, Field, SelectField, SubmitButton, TextArea } from "@/components/forms";
import { dateToLocalInput, formatLocal } from "@/lib/localTime";
import { getAssignment } from "@/server/access/assignments";
import { listCourses } from "@/server/access/courses";
import { NotFoundError } from "@/server/access/errors";
import { getPreferences } from "@/server/access/schedule";
import { requireUser } from "@/server/access/session";
import { DEFAULT_ESTIMATE_MINUTES } from "@/server/planning/toPlanInput";
import { addMilestone, deleteAssignment, deleteMilestone, toggleMilestone, updateAssignment, updateProgress } from "../../actions";
import { KIND_OPTIONS, PRIORITY_OPTIONS } from "../../options";
import { Card, Loading } from "../../ui";

async function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const a = await getAssignment(user.id, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const [{ timeZone }, courses] = await Promise.all([getPreferences(user.id), listCourses(user.id)]);
  const stepTotal = a.milestones.reduce((s, m) => s + m.estimatedMinutes, 0);
  const estimate = a.estimatedMinutes ?? DEFAULT_ESTIMATE_MINUTES[a.kind];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href={`/courses/${a.course.id}`} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← {a.course.name}
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{a.title}</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Due {formatLocal(a.dueAt, timeZone, "cccc LLLL d, h:mm a")} ·{" "}
          {a.milestones.length ? `${stepTotal} min across ${a.milestones.length} steps` : `about ${estimate} min${a.estimatedMinutes ? "" : " (default estimate)"}`}
        </p>
      </header>

      <Card title="Steps">
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Break the work into steps and the planner schedules them in order. When steps exist, their total replaces the overall
          estimate. AI-suggested steps are coming soon.
        </p>
        {a.milestones.length > 0 && (
          <ol className="mb-4 flex flex-col gap-2">
            {a.milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className={m.doneAt ? "text-slate-400 line-through" : ""}>
                  {m.order}. {m.title} · {m.estimatedMinutes} min
                </span>
                <span className="flex gap-2">
                  <ActionForm action={toggleMilestone.bind(null, m.id, !m.doneAt)} aria-label={m.doneAt ? "Mark step not done" : "Mark step done"}>
                    <SubmitButton variant="secondary">{m.doneAt ? "Undo" : "Done"}</SubmitButton>
                  </ActionForm>
                  <ActionForm action={deleteMilestone.bind(null, m.id)} aria-label="Remove step">
                    <SubmitButton variant="danger">Remove</SubmitButton>
                  </ActionForm>
                </span>
              </li>
            ))}
          </ol>
        )}
        <ActionForm action={addMilestone.bind(null, a.id)} className="grid gap-4 sm:grid-cols-3" aria-label="Add a step">
          <div className="sm:col-span-2">
            <Field label="Step" name="title" required />
          </div>
          <Field label="Minutes" name="estimatedMinutes" type="number" min={5} step={5} required />
          <div className="sm:col-span-3">
            <SubmitButton variant="secondary">Add step</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title="Progress">
        <ActionForm action={updateProgress.bind(null, a.id)} className="flex flex-wrap items-end gap-4" aria-label="Progress">
          <Field label="Minutes already done" name="completedMinutes" type="number" min={0} step={5} defaultValue={a.completedMinutes} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="studentDone" defaultChecked={a.studentDone} /> Finished / submitted
          </label>
          <SubmitButton variant="secondary">Save progress</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Details">
        <ActionForm action={updateAssignment.bind(null, a.id)} className="grid gap-4 sm:grid-cols-2" aria-label="Assignment details">
          <Field label="Title" name="title" defaultValue={a.title} required />
          <SelectField label="Course" name="courseId" options={courses.map((c) => ({ value: c.id, label: c.name }))} defaultValue={a.course.id} />
          <SelectField label="Type" name="kind" options={KIND_OPTIONS} defaultValue={a.kind} />
          <Field label="Due" name="dueAt" type="datetime-local" defaultValue={dateToLocalInput(a.dueAt, timeZone)} required />
          <Field label="Estimated minutes" name="estimatedMinutes" type="number" min={5} step={5} defaultValue={a.estimatedMinutes ?? ""} />
          <SelectField label="Priority" name="priority" options={PRIORITY_OPTIONS} defaultValue={String(a.priority)} />
          <div className="sm:col-span-2">
            <TextArea label="Description" name="description" defaultValue={a.description ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton variant="secondary">Save</SubmitButton>
          </div>
        </ActionForm>
        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
          <ActionForm action={deleteAssignment.bind(null, a.id, a.course.id)} aria-label="Delete assignment">
            <SubmitButton variant="danger">Delete assignment</SubmitButton>
          </ActionForm>
        </div>
      </Card>
    </div>
  );
}

export default function AssignmentPage({ params }: PageProps<"/assignments/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <AssignmentDetail params={params} />
    </Suspense>
  );
}
