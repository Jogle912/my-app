import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/forms";
import { listCourses } from "@/server/access/courses";
import { requireUser } from "@/server/access/session";
import { createCourse } from "../actions";
import { DIFFICULTY_OPTIONS } from "../options";
import { Card, Loading, PageHeader } from "../ui";

export const metadata = { title: "Courses · StudyPilot" };

async function CourseList() {
  const user = await requireUser();
  const courses = await listCourses(user.id);
  if (courses.length === 0) return <p className="text-slate-600 dark:text-slate-300">No courses yet. Add your first one below.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {courses.map((c) => (
        <li key={c.id}>
          <Link
            href={`/courses/${c.id}`}
            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="font-medium">
              {c.name}
              {c.code && <span className="ml-2 text-sm text-slate-500">{c.code}</span>}
            </span>
            <span className="text-sm text-slate-500">
              {c._count.assignments} assignment{c._count.assignments === 1 ? "" : "s"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function CoursesPage() {
  return (
    <>
      <PageHeader title="Courses">Canvas import arrives in a later update. For now, add courses by hand.</PageHeader>
      <div className="flex flex-col gap-6">
        <Suspense fallback={<Loading />}>
          <CourseList />
        </Suspense>
        <Card title="Add a course">
          <ActionForm action={createCourse} className="grid gap-4 sm:grid-cols-2" aria-label="Add a course">
            <Field label="Course name" name="name" required />
            <Field label="Code" name="code" hint="e.g. MATH 1610" />
            <Field label="Term" name="term" hint="e.g. Spring 2027" />
            <SelectField label="How hard is it for you?" name="difficulty" options={DIFFICULTY_OPTIONS} defaultValue="3" />
            <div className="sm:col-span-2">
              <SubmitButton>Add course</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
