import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coursesWithContent, lessonsForCourse } from "./src/courseContent.js";

const app = express();
const port = process.env.PORT || 3000;
const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(root, "data", "student.json");

app.use(express.json());

const seed = {
  profile: {
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    goal: "Software Developer",
    skills: ["JavaScript", "Problem solving", "HTML & CSS"],
  },
  courses: [
    { id: "java", title: "Java Programming", category: "Programming", description: "Build a strong foundation in Java, object-oriented programming, and application development.", level: "Beginner", duration: "8 weeks", color: "violet", icon: "code", lessons: ["Java fundamentals", "Variables & control flow", "Object-oriented programming", "Collections & generics", "Build a Java application"] },
    { id: "python", title: "Python Programming", category: "Programming", description: "Learn Python from the ground up and use it to solve real-world problems.", level: "Beginner", duration: "6 weeks", color: "blue", icon: "terminal", lessons: ["Python essentials", "Working with data", "Functions & modules", "Files & APIs", "Build a Python project"] },
    { id: "web", title: "Web Development", category: "Development", description: "Create responsive, accessible websites with modern HTML, CSS, and JavaScript.", level: "Intermediate", duration: "10 weeks", color: "orange", icon: "globe", lessons: ["HTML foundations", "Modern CSS", "JavaScript essentials", "React fundamentals", "Launch your portfolio"] },
    { id: "design", title: "UI/UX Design", category: "Design", description: "Turn user needs into intuitive interfaces, thoughtful prototypes, and polished designs.", level: "Beginner", duration: "5 weeks", color: "pink", icon: "pen", lessons: ["Design thinking", "User research", "Wireframing", "Prototyping & testing", "Present a case study"] },
    { id: "data", title: "Data Analytics", category: "Data", description: "Explore, analyze, and visualize data to uncover insights and make better decisions.", level: "Intermediate", duration: "8 weeks", color: "green", icon: "chart", lessons: ["Analytics foundations", "Spreadsheets & SQL", "Data cleaning", "Visualization", "Build an insights dashboard"] },
    { id: "cloud", title: "Cloud Computing", category: "Technology", description: "Understand cloud fundamentals, core infrastructure, and how to deploy applications.", level: "Intermediate", duration: "7 weeks", color: "cyan", icon: "cloud", lessons: ["Cloud concepts", "Compute & storage", "Networking basics", "Security & identity", "Deploy a cloud project"] },
  ],
  enrolled: ["web", "python", "design"],
  completed: { web: [0, 1], python: [0, 1, 2], design: [0] },
  activity: [
    { courseId: "web", text: "Completed Modern CSS", when: "Today" },
    { courseId: "python", text: "Completed Functions & modules", when: "Yesterday" },
    { courseId: "design", text: "Started User research", when: "2 days ago" },
  ],
};

async function readData() {
  let data;
  let changed = false;
  try {
    data = JSON.parse(await fs.readFile(dataFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    data = structuredClone(seed);
    changed = true;
  }

  if (data.contentVersion !== 1) {
    const legacyLessonIds = {
      java: ["what-is-java", "java-variables", "java-classes-objects", "java-data-types", "first-java-program"],
      python: ["python-intro", "python-variables", "python-functions", "python-loops", "python-lists-dictionaries"],
      web: ["html-basics", "css-fundamentals", "javascript-basics", "dom-manipulation", "responsive-design"],
      design: ["ui-ux-intro", "design-principles", "wireframes", "prototyping", "usability-testing"],
      data: ["analytics-intro", "excel-fundamentals", "python-data-analysis", "data-visualization", "basic-statistics"],
      cloud: ["cloud-intro", "cloud-service-models", "aws-fundamentals", "cloud-deployment", "cloud-deployment"],
    };
    for (const [courseId, progress] of Object.entries(data.completed ?? {})) {
      const lessonIds = legacyLessonIds[courseId] ?? [];
      data.completed[courseId] = [...new Set(progress.map((item) =>
        Number.isInteger(item) ? lessonIds[item] : item
      ).filter((item) => lessonsForCourse(courseId).some((lesson) => lesson.id === item)))];
    }
    data.contentVersion = 1;
    changed = true;
  }
  if (!data.lastLessons) {
    data.lastLessons = {};
    changed = true;
  }
  if (!Array.isArray(data.recentLessons)) {
    data.recentLessons = (data.activity ?? []).slice(0, 8).flatMap((item) => {
      const available = lessonsForCourse(item.courseId);
      const title = item.text.replace(/^Completed /, "");
      const match = available.find((lesson) => lesson.title.toLowerCase() === title.toLowerCase());
      const lessonId = match?.id ?? data.completed?.[item.courseId]?.at(-1);
      return lessonId ? [{ courseId: item.courseId, lessonId, when: item.when }] : [];
    });
    changed = true;
  }
  const recentLessons = [...new Map(data.recentLessons.map((item) =>
    [`${item.courseId}:${item.lessonId}`, item]
  )).values()].slice(0, 8);
  if (recentLessons.length !== data.recentLessons.length) changed = true;
  data.recentLessons = recentLessons;
  for (const course of data.courses) {
    if (!data.lastLessons[course.id]) {
      const recent = data.recentLessons.find((item) => item.courseId === course.id);
      const courseLessons = lessonsForCourse(course.id);
      data.lastLessons[course.id] = recent?.lessonId ??
        courseLessons.find((lesson) => !data.completed?.[course.id]?.includes(lesson.id))?.id ??
        courseLessons[0]?.id;
      changed = true;
    }
  }
  if (changed) await writeData(data);
  return data;
}

async function writeData(data) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

app.get("/api/state", async (_req, res, next) => {
  try {
    const data = await readData();
    res.json({ ...data, courses: coursesWithContent(data.courses) });
  } catch (error) { next(error); }
});

app.put("/api/profile", async (req, res, next) => {
  try {
    const { name, email, goal, skills } = req.body;
    if (![name, email, goal].every((value) => typeof value === "string" && value.trim())) {
      return res.status(400).json({ error: "Name, email, and career goal are required." });
    }
    if (!Array.isArray(skills) || !skills.every((skill) => typeof skill === "string")) {
      return res.status(400).json({ error: "Skills must be a list of text values." });
    }
    const data = await readData();
    data.profile = { name: name.trim(), email: email.trim(), goal: goal.trim(), skills: skills.map((skill) => skill.trim()).filter(Boolean) };
    await writeData(data);
    res.json(data.profile);
  } catch (error) { next(error); }
});

app.post("/api/courses/:id/enroll", async (req, res, next) => {
  try {
    const data = await readData();
    const course = data.courses.find((item) => item.id === req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found." });
    if (!data.enrolled.includes(course.id)) data.enrolled.push(course.id);
    data.completed[course.id] ??= [];
    await writeData(data);
    res.json({ ...data, courses: coursesWithContent(data.courses) });
  } catch (error) { next(error); }
});

app.post("/api/courses/:id/continue", async (req, res, next) => {
  try {
    const data = await readData();
    const course = data.courses.find((item) => item.id === req.params.id);
    const lessonId = req.body.lessonId;
    const lesson = lessonsForCourse(req.params.id).find((item) => item.id === lessonId);
    if (!course || !lesson) return res.status(404).json({ error: "Course or lesson not found." });
    if (!data.enrolled.includes(course.id)) return res.status(409).json({ error: "Enroll in this course before starting lessons." });
    data.lastLessons[course.id] = lesson.id;
    data.recentLessons = [
      { courseId: course.id, lessonId: lesson.id, when: "Just now" },
      ...data.recentLessons.filter((item) => item.courseId !== course.id || item.lessonId !== lesson.id),
    ].slice(0, 8);
    await writeData(data);
    res.json({ ...data, courses: coursesWithContent(data.courses) });
  } catch (error) { next(error); }
});

app.post("/api/courses/:id/lessons/:lessonId/complete", async (req, res, next) => {
  try {
    const data = await readData();
    const course = data.courses.find((item) => item.id === req.params.id);
    const courseLessons = lessonsForCourse(req.params.id);
    const requestedId = /^\d+$/.test(req.params.lessonId) ? courseLessons[Number(req.params.lessonId)]?.id : req.params.lessonId;
    const lesson = courseLessons.find((item) => item.id === requestedId);
    if (!course || !lesson) return res.status(404).json({ error: "Course or lesson not found." });
    if (!data.enrolled.includes(course.id)) return res.status(409).json({ error: "Enroll in this course before completing lessons." });
    data.completed[course.id] ??= [];
    if (!data.completed[course.id].includes(lesson.id)) {
      data.completed[course.id].push(lesson.id);
      data.activity.unshift({ courseId: course.id, text: `Completed ${lesson.title}`, when: "Just now" });
      data.activity = data.activity.slice(0, 8);
    }
    await writeData(data);
    res.json({ ...data, courses: coursesWithContent(data.courses) });
  } catch (error) { next(error); }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "dist")));
  app.get("*", (_req, res) => res.sendFile(path.join(root, "dist", "index.html")));
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong while saving your progress." });
});

app.listen(port, () => console.log(`SkillBridge is running at http://localhost:${port}`));
