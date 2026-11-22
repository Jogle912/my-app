import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, DaysField, Field, SelectField, SubmitButton, TextArea } from "@/components/forms";
import { formatDays, formatLocal } from "@/lib/localTime";
import { getCourse } from "@/server/access/courses";
import { NotFoundError } from "@/server/access/errors";
import { getPreferences } from "@/server/access/schedule";
import { requireUser } from "@/server/access/session";
import { addMeeting, createAssignment, deleteCourse, deleteMeeting, updateCourse } from "../../actions";
import { Card, Loading } from "../../ui";
import { DIFFICULTY_OPTIONS, KIND_OPTIONS, PRIORITY_OPTIONS } from "../../options";

async function CourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const course = await getCourse(user.id, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const { timeZone } = await getPreferences(user.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
        <Link href="/courses" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← All courses
        </Link>
      </header>

      <Card title="Assignments and exams">
        {course.assignments.length === 0 ? (
          <p className="mb-4 text-slate-600 dark:text-slate-300">Nothing added yet.</p>
        ) : (
          <ul className="mb-6 flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
            {course.assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <Link href={`/assignments/${a.id}`} className={`font-medium hover:underline ${a.studentDone ? "text-slate-400 line-through" : ""}`}>
                  {a.title}
                </Link>
                <span className="text-slate-500">
                  {a.kind.toLowerCase()} · due {formatLocal(a.dueAt, timeZone)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <h3 className="mb-2 font-medium">Add an assignment or exam</h3>
        <ActionForm action={createAssignment} className="grid gap-4 sm:grid-cols-2" aria-label="Add an assignment">
          <input type="hidden" name="courseId" value={course.id} />
          <Field label="Title" name="title" required />
          <SelectField label="Type" name="kind" options={KIND_OPTIONS} defaultValue="HOMEWORK" />
          <Field label="Due (or exam start)" name="dueAt" type="datetime-local" required hint={`Your time zone: ${timeZone}`} />
          <Field label="Estimated minutes" name="estimatedMinutes" type="number" min={5} step={5} hint="Leave blank to use a default for this type." />
          <SelectField label="Priority" name="priority" options={PRIORITY_OPTIONS} defaultValue="3" />
          <div className="sm:col-span-2">
            <TextArea label="Description (optional)" name="description" />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Add</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title="Class meetings">
        {course.meetings.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {course.meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {formatDays(m.days)} · {m.startTime}–{m.endTime}
                  {m.location && ` · ${m.location}`}
                </span>
                <ActionForm action={deleteMeeting.bind(null, m.id)} aria-label="Remove meeting">
                  <SubmitButton variant="danger">Remove</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addMeeting.bind(null, course.id)} className="grid gap-4 sm:grid-cols-3" aria-label="Add a class meeting">
          <div className="sm:col-span-3">
            <DaysField />
          </div>
          <Field label="Starts" name="startTime" type="time" required />
          <Field label="Ends" name="endTime" type="time" required />
          <Field label="Location" name="location" />
          <div className="sm:col-span-3">
            <SubmitButton variant="secondary">Add meeting</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title="Course settings">
        <ActionForm action={updateCourse.bind(null, course.id)} className="grid gap-4 sm:grid-cols-2" aria-label="Course settings">
          <Field label="Course name" name="name" defaultValue={course.name} required />
          <Field label="Code" name="code" defaultValue={course.code ?? ""} />
          <Field label="Term" name="term" defaultValue={course.term ?? ""} />
          <SelectField label="How hard is it for you?" name="difficulty" options={DIFFICULTY_OPTIONS} defaultValue={String(course.difficulty)} />
          <div className="sm:col-span-2">
            <SubmitButton variant="secondary">Save</SubmitButton>
          </div>
        </ActionForm>
        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
          <ActionForm action={deleteCourse.bind(null, course.id)} aria-label="Delete course">
            <SubmitButton variant="danger">Delete course and its assignments</SubmitButton>
          </ActionForm>
        </div>
      </Card>
    </div>
  );
}

export default function CoursePage({ params }: PageProps<"/courses/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <CourseDetail params={params} />
    </Suspense>
  );
}
