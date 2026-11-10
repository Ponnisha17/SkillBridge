import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Award, BarChart3, Bell, BookOpen, BriefcaseBusiness,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Cloud, Code2, Compass,
  Download, Flame, Globe2, GraduationCap, LayoutDashboard, LogOut, Menu, MoreHorizontal, PenTool,
  Plus, Search, Settings2, Sparkles, Target, Terminal, X, Zap
} from "lucide-react";
import "./style.css";
import "./learning.css";

const careerData = [
  { title: "Software Developer", icon: Code2, color: "violet", description: "Design and build software that solves meaningful problems.", skills: ["JavaScript", "Data structures", "Git & GitHub", "Problem solving"], steps: ["Learn programming fundamentals", "Build projects with a modern framework", "Practice algorithms & collaboration", "Create a portfolio and prepare for interviews"], prep: ["Polish 2–3 portfolio projects", "Practice technical interview questions", "Update your resume and GitHub"] },
  { title: "UI/UX Designer", icon: PenTool, color: "pink", description: "Create digital experiences people love to use.", skills: ["User research", "Wireframing", "Figma", "Prototyping"], steps: ["Learn design principles and accessibility", "Practice user research and synthesis", "Build prototypes and test with users", "Document your process in case studies"], prep: ["Publish 2 detailed case studies", "Practice presenting design decisions", "Build a clean portfolio website"] },
  { title: "Data Analyst", icon: BarChart3, color: "green", description: "Turn complex data into clear, actionable insights.", skills: ["SQL", "Python", "Data visualization", "Statistics"], steps: ["Build spreadsheet and statistics foundations", "Learn SQL and Python for analysis", "Create clear charts and dashboards", "Practice communicating insights"], prep: ["Complete an end-to-end analysis project", "Share a dashboard and written summary", "Practice business case questions"] },
  { title: "Cloud Engineer", icon: Cloud, color: "cyan", description: "Build secure, reliable systems on the cloud.", skills: ["Cloud platforms", "Networking", "Linux", "Security"], steps: ["Learn networking and Linux fundamentals", "Explore core cloud services", "Deploy and monitor real applications", "Study security and infrastructure as code"], prep: ["Deploy a portfolio project to the cloud", "Practice architecture fundamentals", "Prepare for an entry-level certification"] },
];

const iconMap = { code: Code2, terminal: Terminal, globe: Globe2, pen: PenTool, chart: BarChart3, cloud: Cloud };
const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My learning", icon: BookOpen },
  { label: "Explore skills", icon: Compass },
  { label: "Career paths", icon: BriefcaseBusiness },
];

function App() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All skills");
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");

  const loadData = async () => {
    try {
      const response = await fetch("/api/state");
      if (!response.ok) throw new Error("Could not load your learning dashboard.");
      setData(await response.json());
    } catch (err) {
      setError(`${err.message} Start the app with npm run dev.`);
    } finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, []);

  const courseById = useMemo(() => Object.fromEntries((data?.courses ?? []).map((course) => [course.id, course])), [data]);
  const progressFor = (course) => {
    const completed = data?.completed?.[course.id] ?? [];
    return Math.round((course.lessons.filter((lesson) => completed.includes(lesson.id)).length / course.lessons.length) * 100);
  };
  const enrolledCourses = (data?.enrolled ?? []).map((id) => courseById[id]).filter(Boolean);
  const overallProgress = enrolledCourses.length ? Math.round(enrolledCourses.reduce((total, course) => total + progressFor(course), 0) / enrolledCourses.length) : 0;
  const completedCourses = enrolledCourses.filter((course) => progressFor(course) === 100).length;
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const api = async (url, options = {}) => {
    const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
    setData(result.courses ? result : { ...data, profile: result });
    return result;
  };
  const enroll = async (course) => {
    try { await api(`/api/courses/${course.id}/enroll`, { method: "POST" }); notify(`You're enrolled in ${course.title}.`); setPage("My learning"); }
    catch (err) { setError(err.message); }
  };
  const completeLesson = async (course, lesson) => {
    try { await api(`/api/courses/${course.id}/lessons/${lesson.id}/complete`, { method: "POST" }); notify("Lesson marked as complete."); }
    catch (err) { setError(err.message); }
  };
  const startLesson = async (course, lesson) => {
    try {
      await api(`/api/courses/${course.id}/continue`, { method: "POST", body: JSON.stringify({ lessonId: lesson.id }) });
      setActiveCourse(null);
      setActiveLesson({ courseId: course.id, lessonId: lesson.id });
      setPage("My learning");
    } catch (err) { setError(err.message); }
  };
  const continueCourse = (course) => {
    const lessons = course.lessons;
    const completed = data.completed[course.id] ?? [];
    const lastLessonId = data.lastLessons?.[course.id];
    const lastIndex = lessons.findIndex((lesson) => lesson.id === lastLessonId);
    const nextIncomplete = lessons.find((lesson) => !completed.includes(lesson.id));
    const lesson = lastIndex >= 0 && !completed.includes(lessons[lastIndex].id)
      ? lessons[lastIndex]
      : nextIncomplete ?? lessons[Math.max(lastIndex, 0)] ?? lessons[0];
    if (lesson) startLesson(course, lesson);
  };
  const continueLatest = () => {
    const recent = data.recentLessons?.find((item) => data.enrolled.includes(item.courseId));
    const course = recent ? courseById[recent.courseId] : enrolledCourses[0];
    if (!course) return setPage("Explore skills");
    const lesson = course.lessons.find((item) => item.id === recent?.lessonId);
    if (lesson) startLesson(course, lesson);
    else continueCourse(course);
  };

  if (loading) return <div className="loading-screen"><div className="brand-mark"><GraduationCap size={22} /></div><span>Getting your learning space ready…</span></div>;
  if (!data) return <div className="load-error"><CircleHelp size={30} /><h2>We couldn't load SkillBridge</h2><p>{error}</p><button className="button primary" onClick={() => { setLoading(true); loadData(); }}>Try again</button></div>;

  const renderPage = () => {
    if (page === "Explore skills") return <ExplorePage courses={data.courses} enrolled={data.enrolled} progressFor={progressFor} onEnroll={enroll} onOpen={setActiveCourse} onStart={continueCourse} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} />;
    if (page === "My learning") return <LearningPage courses={enrolledCourses} completed={data.completed} progressFor={progressFor} onOpen={setActiveCourse} onStart={continueCourse} onExplore={() => setPage("Explore skills")} />;
    if (page === "Career paths") return <CareerPage />;
    return <Dashboard data={data} enrolledCourses={enrolledCourses} progressFor={progressFor} overallProgress={overallProgress} completedCourses={completedCourses} onNavigate={setPage} onOpen={setActiveCourse} onStart={startLesson} onContinue={continueCourse} onContinueLatest={continueLatest} />;
  };

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage("Overview"); }}>
          <span className="brand-mark"><GraduationCap size={21} strokeWidth={2.2} /></span><span>skill<span className="brand-accent">bridge</span></span>
        </a>
        <div className="workspace-switch"><span className="workspace-icon">A</span><span><b>Alex's workspace</b><small>Student plan</small></span><ChevronDown size={15} /></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${page === label ? "active" : ""}`} onClick={() => { setPage(label); setMobileNav(false); }}><Icon size={18} /><span>{label}</span>{label === "My learning" && <span className="nav-count">{enrolledCourses.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="streak-card"><div className="streak-icon"><Flame size={18} fill="currentColor" /></div><div><b>You're on a roll!</b><p>Keep learning to build your streak.</p></div><span className="streak-num">3 <small>days</small></span></div>
          <button className="nav-item" onClick={() => setProfileOpen(true)}><Settings2 size={18} /><span>Settings</span></button>
          <button className="profile-mini" onClick={() => setProfileOpen(true)}><span className="avatar">AM</span><span><b>{data.profile.name}</b><small>{data.profile.email}</small></span><MoreHorizontal size={19} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{page}</b></div>
          <div className="topbar-actions"><div className="global-search"><Search size={16} /><input placeholder="Search anything..." value={search} onChange={(e) => { setSearch(e.target.value); if (e.target.value) setPage("Explore skills"); }} /><kbd>⌘ K</kbd></div><button className="icon-button notification-button" aria-label="Notifications" onClick={() => notify("You're all caught up!") }><Bell size={18} /><i /></button><button className="avatar top-avatar" onClick={() => setProfileOpen(true)} aria-label="Edit profile">AM</button></div>
        </header>
        {error && <div className="error-banner"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={15} /></button></div>}
        <div className={`page-content ${activeLesson ? "lesson-page-content" : ""}`}>
          {activeLesson ? (() => {
            const course = courseById[activeLesson.courseId];
            const lesson = course?.lessons.find((item) => item.id === activeLesson.lessonId);
            return course && lesson ? <LessonPage course={course} lesson={lesson} completed={data.completed[course.id] ?? []} progress={progressFor(course)} onStart={startLesson} onComplete={completeLesson} onBack={() => setActiveLesson(null)} /> : renderPage();
          })() : renderPage()}
        </div>
        <footer className="app-footer"><span>© 2025 SkillBridge</span><span>Built for your next big thing <Sparkles size={13} /></span><a href="#" onClick={(event) => { event.preventDefault(); notify("You're all caught up!"); }}>Help center</a></footer>
      </main>
      {activeCourse && <CourseModal course={activeCourse} isEnrolled={data.enrolled.includes(activeCourse.id)} completed={data.completed[activeCourse.id] ?? []} lastLessonId={data.lastLessons?.[activeCourse.id]} onClose={() => setActiveCourse(null)} onEnroll={enroll} onStart={startLesson} />}
      {profileOpen && <ProfileModal profile={data.profile} progress={overallProgress} onClose={() => setProfileOpen(false)} onSave={async (profile) => { try { await api("/api/profile", { method: "PUT", body: JSON.stringify(profile) }); setProfileOpen(false); notify("Profile updated successfully."); } catch (err) { setError(err.message); } }} />}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

function Dashboard({ data, enrolledCourses, progressFor, overallProgress, completedCourses, onNavigate, onOpen, onStart, onContinue, onContinueLatest }) {
  const weekly = [35, 54, 42, 72, 48, 86, 62];
  const completedLessons = enrolledCourses.reduce((count, course) => count + (data.completed[course.id]?.length ?? 0), 0);
  const recentLessons = (data.recentLessons ?? []).map((item) => ({
    ...item,
    course: data.courses.find((course) => course.id === item.courseId),
    lesson: data.courses.find((course) => course.id === item.courseId)?.lessons.find((lesson) => lesson.id === item.lessonId),
  })).filter((item) => item.course && item.lesson).slice(0, 3);
  return <>
    <PageHeading eyebrow="MONDAY, MAY 19, 2025" title={`Good morning, ${data.profile.name.split(" ")[0]} 👋`} description="A little progress each day adds up to big results. Let's make today count." action={<button className="button primary" onClick={() => onNavigate("Explore skills")}><Plus size={16} /> Explore skills</button>} />
    <section className="welcome-banner">
      <div className="welcome-copy"><span className="banner-tag"><Sparkles size={13} /> YOUR LEARNING JOURNEY</span><h2>Build skills. Find your<br />next <span>big thing.</span></h2><p>Your personalized path to becoming a {data.profile.goal.toLowerCase()} starts here.</p><button className="button banner-button" onClick={() => enrolledCourses.length ? onContinueLatest() : onNavigate("Explore skills")}>Continue learning <ArrowRight size={16} /></button></div>
      <div className="banner-art" aria-hidden="true"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="art-glow"></div><div className="art-card card-back"><span className="art-card-icon purple"><Code2 size={19} /></span><span><b>Build your skills</b><small>One lesson at a time</small></span><CheckCircle2 size={17} /></div><div className="art-card card-front"><span className="art-card-icon mint"><Target size={19} /></span><span><b>Career ready</b><small>Your future is in motion</small></span><ArrowUpRight size={17} /></div><div className="floating-badge"><Zap size={15} fill="currentColor" /> Stay curious</div></div>
    </section>
    <section className="stats-grid">
      <StatCard label="Enrolled courses" value={String(enrolledCourses.length).padStart(2, "0")} icon={BookOpen} tone="blue" trend="Keep up the great work" />
      <StatCard label="Learning progress" value={`${overallProgress}%`} icon={BarChart3} tone="purple" trend="Across all your courses" />
      <StatCard label="Lessons completed" value={String(completedLessons).padStart(2, "0")} icon={Award} tone="orange" trend={`${completedCourses} courses completed`} />
      <StatCard label="Learning streak" value="3 days" icon={Flame} tone="pink" trend="Your best is 7 days" />
    </section>
    <div className="dashboard-grid">
      <section className="panel courses-panel"><div className="section-title"><div><h2>Pick up where you left off</h2><p>Your learning is in full swing.</p></div><button className="text-button" onClick={() => onNavigate("My learning")}>View all <ArrowRight size={15} /></button></div>
        <div className="course-list">{enrolledCourses.slice(0, 3).map((course) => <CourseRow key={course.id} course={course} progress={progressFor(course)} onClick={() => onContinue(course)} />)}</div>
        {enrolledCourses.length === 0 && <EmptyState title="Your learning journey starts here" text="Explore the catalogue and enroll in your first course." action={() => onNavigate("Explore skills")} button="Explore courses" />}
      </section>
      <section className="panel activity-panel"><div className="section-title"><div><h2>Learning activity</h2><p>Little wins add up.</p></div><button className="dots-button" aria-label="More activity options">···</button></div>
        <div className="activity-chart"><div className="chart-labels"><span>2h</span><span>1h</span><span>0h</span></div><div className="chart-canvas"><div className="chart-gridline one"></div><div className="chart-gridline two"></div><div className="chart-gridline three"></div><div className="bars">{weekly.map((height, i) => <div className={`bar-wrap ${i === 5 ? "selected" : ""}`} key={i}><span className="bar" style={{ height: `${height}%` }}></span><small>{["M", "T", "W", "T", "F", "S", "S"][i]}</small></div>)}</div></div></div><div className="chart-summary"><span><i className="legend-dot"></i> Hours learned</span><b>4.5 hrs <small><ArrowUpRight size={13} /> 12%</small></b></div>
      </section>
    </div>
    <div className="bottom-grid"><section className="panel activity-feed"><div className="section-title"><div><h2>Recently studied</h2><p>Jump back into a lesson.</p></div><button className="text-button" onClick={() => onNavigate("My learning")}>My learning <ArrowRight size={15} /></button></div><div className="feed-list">{recentLessons.map(({ course, lesson, when }) => <button className="feed-item recent-lesson" key={`${course.id}-${lesson.id}`} onClick={() => onStart(course, lesson)}><div className={`feed-icon ${course.color}`}><BookOpen size={15} /></div><div><b>{lesson.title}</b><span>{course.title} <i>·</i> {when}</span></div><ChevronRight size={16} /></button>)}{recentLessons.length === 0 && <p className="empty-recent">Your recently opened lessons will show up here.</p>}</div></section>
      <section className="goal-card"><span className="goal-icon"><Target size={19} /></span><div className="eyebrow">YOUR CAREER GOAL</div><h2>{data.profile.goal}</h2><p>Stay focused on your goal. You're closer than you think.</p><button className="text-button" onClick={() => onNavigate("Career paths")}>Explore career path <ArrowRight size={15} /></button><div className="goal-decoration"><Target size={105} /></div></section></div>
    <div className="section-title recommended-title"><div><div className="eyebrow">CURATED FOR YOU</div><h2>Recommended skills</h2></div><button className="text-button" onClick={() => onNavigate("Explore skills")}>Explore all skills <ArrowRight size={15} /></button></div>
    <div className="recommended-grid">{data.courses.filter((course) => !data.enrolled.includes(course.id)).slice(0, 3).map((course) => <MiniCourse key={course.id} course={course} onClick={() => onOpen(course)} />)}</div>
  </>;
}

function StatCard({ label, value, icon: Icon, tone, trend }) { return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><span className="stat-label">{label}</span><div className="stat-value">{value}</div><div className="stat-trend"><span className={`trend-dot ${tone}`}></span>{trend}</div><ArrowUpRight className="stat-arrow" size={16} /></article>; }

function CourseRow({ course, progress, onClick }) {
  const Icon = iconMap[course.icon] || Code2;
  return <button className="course-row" onClick={onClick}><div className={`course-icon ${course.color}`}><Icon size={19} /></div><div className="course-row-main"><div className="course-name-line"><b>{course.title}</b><span className="course-level">{course.level}</span></div><div className="course-progress-line"><div className="progress-track"><span className={course.color} style={{ width: `${progress}%` }} /></div><span>{progress}%</span></div></div><span className="course-continue">Continue <ArrowRight size={14} /></span></button>;
}

function ExplorePage({ courses, enrolled, progressFor, onEnroll, onOpen, onStart, search, setSearch, filter, setFilter }) {
  const categories = ["All skills", "Programming", "Development", "Design", "Data", "Technology"];
  const visible = courses.filter((course) => (filter === "All skills" || course.category === filter) && `${course.title} ${course.description}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeading eyebrow="LEARN SOMETHING NEW" title="Explore skills" description="Find your next skill, follow your curiosity, and open new doors." action={<div className="catalog-search"><Search size={17} /><input placeholder="Find a course..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>/</kbd></div>} />
    <div className="catalog-feature"><div><span className="banner-tag"><Sparkles size={13} /> YOUR NEXT CHAPTER STARTS HERE</span><h2>Skills for the future,<br />built <span>by you.</span></h2><p>Learn at your own pace with curated courses made to help you get career-ready.</p><div className="feature-meta"><span><BookOpen size={15} /> 6 expert-led courses</span><span><Target size={15} /> Learn on your schedule</span></div></div><div className="feature-illustration"><div className="feature-sun"></div><div className="feature-book book-one"></div><div className="feature-book book-two"></div><div className="feature-plant">✳</div><div className="feature-dot dot-one"></div><div className="feature-dot dot-two"></div></div></div>
    <div className="filter-row">{categories.map((category) => <button key={category} className={`filter-chip ${filter === category ? "selected" : ""}`} onClick={() => setFilter(category)}>{category}</button>)}<span className="result-count">{visible.length} courses</span></div>
    <div className="catalog-grid">{visible.map((course) => <CourseCard key={course.id} course={course} enrolled={enrolled.includes(course.id)} progress={progressFor(course)} onEnroll={onEnroll} onOpen={onOpen} onStart={() => onStart(course)} />)}</div>
    {visible.length === 0 && <EmptyState title="No courses found" text="Try a different search or category." action={() => { setSearch(""); setFilter("All skills"); }} button="Clear filters" />}
  </>;
}

function CourseCard({ course, enrolled, progress, onEnroll, onOpen, onStart }) {
  const Icon = iconMap[course.icon] || Code2;
  return <article className="catalog-card"><div className={`catalog-card-art ${course.color}`}><span className="course-icon"><Icon size={23} /></span><span className="course-category">{course.category}</span><span className="art-lines"></span></div><div className="catalog-card-body"><div className="catalog-card-meta"><span>{course.level}</span><span className="meta-dot">·</span><span>{course.duration}</span></div><h3>{course.title}</h3><p>{course.description}</p><div className="catalog-card-footer">{enrolled ? <><div className="course-progress-line"><div className="progress-track"><span className={course.color} style={{ width: `${progress}%` }} /></div><span>{progress}%</span></div><button className="button small primary" onClick={onStart}>{progress === 100 ? "Review course" : "Start Learning"} <ArrowRight size={14} /></button></> : <><span className="lesson-count"><BookOpen size={14} /> {course.lessons.length} lessons</span><button className="button small outline" onClick={() => onEnroll(course)}>Enroll now <ArrowRight size={14} /></button></>}</div></div></article>;
}

function LearningPage({ courses, completed, progressFor, onOpen, onStart, onExplore }) {
  const active = courses.filter((course) => progressFor(course) < 100);
  const finished = courses.filter((course) => progressFor(course) === 100);
  return <><PageHeading eyebrow="YOUR PERSONAL LEARNING SPACE" title="My learning" description="Every lesson is a step closer to where you want to be." action={<button className="button primary" onClick={onExplore}><Plus size={16} /> Find a course</button>} />
    <div className="learning-summary"><div className="summary-icon"><GraduationCap size={22} /></div><div><b>{courses.length} courses in your learning plan</b><span>{finished.length} completed · {active.length} in progress</span></div><div className="summary-progress"><div className="progress-track"><span style={{ width: `${courses.length ? Math.round(courses.reduce((acc, course) => acc + progressFor(course), 0) / courses.length) : 0}%` }} /></div><small>Overall progress</small></div></div>
    {active.length > 0 && <><div className="subheading"><div><h2>In progress</h2><p>Pick up right where you left off.</p></div><span>{active.length} courses</span></div><div className="learning-grid">{active.map((course) => <CourseCard key={course.id} course={course} enrolled progress={progressFor(course)} onOpen={onOpen} onStart={() => onStart(course)} />)}</div></>}
    <div className="subheading completed-heading"><div><h2>Completed courses</h2><p>Look how far you've come.</p></div><span>{finished.length} courses</span></div>
    {finished.length ? <div className="learning-grid">{finished.map((course) => <CourseCard key={course.id} course={course} enrolled progress={100} onOpen={onOpen} onStart={() => onStart(course)} />)}</div> : <div className="empty-completed"><Award size={22} /><div><b>Your first certificate is waiting</b><span>Finish all lessons in a course to see it here.</span></div></div>}
    {!courses.length && <EmptyState title="A fresh start" text="Enroll in your first course to create your learning plan." action={onExplore} button="Explore courses" />}
  </>;
}

function CareerPage() {
  const [selected, setSelected] = useState("Software Developer");
  const career = careerData.find((item) => item.title === selected);
  const Icon = career.icon;
  return <><PageHeading eyebrow="DESIGN YOUR FUTURE" title="Career paths" description="Get a clear, practical roadmap from where you are to where you want to be." />
    <div className="career-layout"><div className="career-selector">{careerData.map((item) => { const CareerIcon = item.icon; return <button key={item.title} onClick={() => setSelected(item.title)} className={`career-option ${selected === item.title ? "chosen" : ""}`}><span className={`career-icon ${item.color}`}><CareerIcon size={18} /></span><span><b>{item.title}</b><small>{item.skills.slice(0, 2).join(" · ")}</small></span><ChevronRight size={16} /></button>; })}</div>
      <div className="career-detail"><div className={`career-hero ${career.color}`}><span className={`career-icon ${career.color}`}><Icon size={22} /></span><div><div className="eyebrow">YOUR CAREER ROADMAP</div><h2>{career.title}</h2><p>{career.description}</p></div><div className="career-hero-shape"><Icon size={90} /></div></div>
        <section className="career-section"><h3><span className="section-number">01</span> Skills to build</h3><p>Focus on these core skills as you grow.</p><div className="skill-tags">{career.skills.map((skill) => <span key={skill}><Check size={13} />{skill}</span>)}</div></section>
        <section className="career-section roadmap-section"><h3><span className="section-number">02</span> Your learning roadmap</h3><p>A step-by-step path to get you career-ready.</p><div className="roadmap">{career.steps.map((step, index) => <div className="roadmap-item" key={step}><span className={`roadmap-node ${index === 0 ? "current" : ""}`}>{index + 1}</span><div><b>{step}</b><span>{index === 0 ? "Start here · Build your foundation" : `${index + 1}–${index + 3} weeks · Keep your momentum`}</span></div>{index === 0 && <span className="current-label">START HERE</span>}</div>)}</div></section>
        <section className="prep-card"><div><span className="prep-icon"><BriefcaseBusiness size={17} /></span><h3>Get career-ready</h3><p>Small steps now make the next step easier.</p><ul>{career.prep.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul></div><div className="prep-decoration"><ArrowUpRight size={66} /></div></section>
      </div></div>
  </>;
}

function MiniCourse({ course, onClick }) { const Icon = iconMap[course.icon] || Code2; return <button className="mini-course" onClick={onClick}><div className={`mini-icon ${course.color}`}><Icon size={19} /></div><div><b>{course.title}</b><span>{course.category} <i>·</i> {course.level}</span></div><ArrowUpRight size={17} /></button>; }

function CourseModal({ course, isEnrolled, completed, lastLessonId, onClose, onEnroll, onStart }) {
  const Icon = iconMap[course.icon] || Code2;
  const progress = Math.round(course.lessons.filter((lesson) => completed.includes(lesson.id)).length / course.lessons.length * 100);
  const defaultLesson = course.lessons.find((lesson) => lesson.id === lastLessonId) ?? course.lessons[0];
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="course-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close" onClick={onClose}><X size={19} /></button><div className={`modal-course-art ${course.color}`}><span className="course-icon"><Icon size={28} /></span><span>{course.category} <i>·</i> {course.duration}</span><div className="modal-art-shape"></div></div><div className="modal-content"><div className="course-level">{course.level}</div><h2 id="modal-title">{course.title}</h2><p>{course.description}</p>{isEnrolled ? <><div className="modal-progress-heading"><b>Your progress</b><span>{progress}% complete · {course.lessons.length} lessons</span></div><div className="progress-track large"><span className={course.color} style={{ width: `${progress}%` }} /></div><div className="lesson-list">{course.modules.map((module) => <div className="course-module" key={module.id}><h3>{module.title}</h3>{module.lessons.map((lesson) => { const done = completed.includes(lesson.id); return <div className={`lesson-item ${done ? "done" : ""}`} key={lesson.id}><span className="lesson-check">{done ? <Check size={14} /> : <span>{String(course.lessons.findIndex((item) => item.id === lesson.id) + 1).padStart(2, "0")}</span>}</span><span><b>{lesson.title}</b><small>{done ? "Completed · ready to review" : lesson.id === lastLessonId ? "Last opened · continue here" : "Lesson · includes examples and a 3-question quiz"}</small></span><button className={`lesson-action ${done ? "lesson-done" : ""}`} onClick={() => onStart(course, lesson)}>{done ? "Review" : lesson.id === lastLessonId ? "Continue" : "Start lesson"}</button></div>; })}</div>)}</div></> : <><div className="modal-benefit"><Sparkles size={17} /><span><b>Learn at your own pace</b><small>{course.lessons.length} lessons with examples and practice questions.</small></span></div><button className="button primary modal-enroll" onClick={() => onEnroll(course)}>Enroll in this course <ArrowRight size={16} /></button></>}</div></section></div>;
}

function LessonPage({ course, lesson, completed, progress, onStart, onComplete, onBack }) {
  const lessonIndex = course.lessons.findIndex((item) => item.id === lesson.id);
  const previous = course.lessons[lessonIndex - 1];
  const next = course.lessons[lessonIndex + 1];
  const isComplete = completed.includes(lesson.id);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const questions = useMemo(() => lesson.quiz.map((question, index) => {
    const choices = [question.answer, question.wrongOne, question.wrongTwo];
    const shift = (lesson.id.length + index) % choices.length;
    return { ...question, choices: choices.map((_, choiceIndex) => choices[(choiceIndex + shift) % choices.length]) };
  }), [lesson.id]);
  const score = questions.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0);
  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
  }, [lesson.id]);
  const handleSubmit = (event) => {
    event.preventDefault();
    if (Object.keys(answers).length === questions.length) setSubmitted(true);
  };
  return <div className="lesson-player">
    <div className="lesson-player-top"><button className="lesson-back" onClick={onBack}><ChevronLeft size={16} /> My learning</button><span>{course.title}</span><div className="lesson-progress-top"><span>Course progress</span><b>{progress}%</b><div className="progress-track"><span className={course.color} style={{ width: `${progress}%` }} /></div></div></div>
    <div className="lesson-player-grid">
      <aside className="lesson-outline"><div className="outline-heading"><div><small>COURSE CONTENT</small><b>{course.title}</b></div><span>{completed.length}/{course.lessons.length}</span></div>
        <div className="outline-modules">{course.modules.map((module) => <section className="outline-module" key={module.id}><h3>{module.title}</h3>{module.lessons.map((item) => { const active = item.id === lesson.id; const done = completed.includes(item.id); return <button key={item.id} className={`outline-lesson ${active ? "current" : ""} ${done ? "complete" : ""}`} onClick={() => onStart(course, item)}><span className="outline-check">{done ? <Check size={12} /> : String(course.lessons.findIndex((entry) => entry.id === item.id) + 1).padStart(2, "0")}</span><span>{item.title}</span></button>; })}</section>)}</div>
      </aside>
      <article className="lesson-article">
        <div className="lesson-breadcrumb"><span>{course.title}</span><ChevronRight size={13} /><span>{lesson.moduleTitle}</span></div>
        <div className="lesson-title-row"><div><div className="eyebrow">{lesson.moduleTitle.toUpperCase()}</div><h1>{lesson.title}</h1></div>{isComplete && <span className="lesson-complete-badge"><CheckCircle2 size={14} /> Completed</span>}</div>
        <div className="lesson-reading-card"><div className="lesson-section-label"><BookOpen size={16} /> THE CONCEPT</div><p>{lesson.explanation}</p><div className={`lesson-example ${lesson.exampleType}`}><div className="example-heading"><span>{lesson.exampleType === "code" ? "EXAMPLE" : "IN PRACTICE"}</span>{lesson.exampleType === "code" && <span>Try it yourself</span>}</div>{lesson.exampleType === "code" ? <pre><code>{lesson.example}</code></pre> : <div className="example-text">{lesson.example}</div>}<p className="example-explanation"><Sparkles size={14} />{lesson.exampleMeaning}</p></div><div className="takeaway-card"><span><CheckCircle2 size={17} /></span><div><b>Remember this</b><p>{lesson.takeaway}</p></div></div></div>
        <form className="lesson-quiz" onSubmit={handleSubmit}><div className="quiz-heading"><span className="quiz-icon"><Target size={17} /></span><div><div className="eyebrow">CHECK YOUR UNDERSTANDING</div><h2>Quick practice</h2><p>Choose an answer for each question. You can try again at any time.</p></div></div>
          {questions.map((question, questionIndex) => <fieldset className="quiz-question" key={`${lesson.id}-${questionIndex}`}><legend><span>{String(questionIndex + 1).padStart(2, "0")}</span>{question.question}</legend><div className="quiz-options">{question.choices.map((choice) => { const selected = answers[questionIndex] === choice; const correct = submitted && choice === question.answer; const incorrect = submitted && selected && !correct; return <button className={`quiz-option ${selected ? "selected" : ""} ${correct ? "answer-correct" : ""} ${incorrect ? "answer-incorrect" : ""}`} type="button" key={choice} disabled={submitted} aria-pressed={selected} onClick={() => setAnswers({ ...answers, [questionIndex]: choice })}><span className="option-radio">{correct ? <Check size={13} /> : String.fromCharCode(65 + question.choices.indexOf(choice))}</span><span>{choice}</span></button>; })}</div>{submitted && <p className={`quiz-explanation ${answers[questionIndex] === question.answer ? "correct" : "incorrect"}`}><CheckCircle2 size={14} />{answers[questionIndex] === question.answer ? "Correct. " : `The correct answer is: ${question.answer}. `}{question.explanation}</p>}</fieldset>)}
          <div className="quiz-actions">{submitted && <div className={`quiz-score ${score === questions.length ? "perfect" : ""}`}><Award size={17} /><b>Your score: {score}/{questions.length}</b><span>{score === questions.length ? "Excellent work!" : "Review the explanations and try again."}</span></div>}<div className="quiz-buttons">{submitted ? <button className="button outline" type="button" onClick={() => { setAnswers({}); setSubmitted(false); }}>Try again <ArrowDownRight size={15} /></button> : <button className="button primary" type="submit" disabled={Object.keys(answers).length !== questions.length}>Check answers <Check size={15} /></button>}</div></div>
        </form>
        <div className="lesson-completion"><div><b>{isComplete ? "Lesson completed" : "Ready to save your progress?"}</b><span>{isComplete ? "Your progress is saved and available on your dashboard." : "Mark this lesson complete when you are comfortable with the material."}</span></div><button className={`button ${isComplete ? "outline" : "primary"}`} disabled={isComplete} onClick={() => onComplete(course, lesson)}>{isComplete ? <><Check size={15} /> Completed</> : <>Mark as Completed <Check size={15} /></>}</button></div>
        <div className="lesson-navigation"><button className="button outline" disabled={!previous} onClick={() => previous && onStart(course, previous)}><ChevronLeft size={16} /> Previous lesson</button><span>Lesson {lessonIndex + 1} of {course.lessons.length}</span>{next ? <button className="button primary" onClick={() => onStart(course, next)}>Next lesson <ChevronRight size={16} /></button> : <button className="button primary" onClick={onBack}>Finish course <Award size={15} /></button>}</div>
      </article>
    </div>
  </div>;
}

function ProfileModal({ profile, progress, onClose, onSave }) {
  const [form, setForm] = useState({ ...profile, skills: profile.skills.join(", ") });
  const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); setSaving(true); await onSave({ ...form, skills: form.skills.split(",").map((skill) => skill.trim()).filter(Boolean) }); setSaving(false); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title"><div className="profile-modal-head"><div><div className="eyebrow">YOUR ACCOUNT</div><h2 id="profile-title">Edit your profile</h2></div><button className="modal-close" aria-label="Close" onClick={onClose}><X size={19} /></button></div><div className="profile-identity"><span className="avatar large-avatar">{profile.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><b>{profile.name}</b><span>Student account</span></div><button type="button" className="text-button" onClick={() => document.getElementById("profile-name")?.focus()}><PenTool size={14} /> Edit details</button></div><form className="profile-form" onSubmit={submit}><label>Full name<input id="profile-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Email address<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Career goal<select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>{careerData.map((career) => <option key={career.title}>{career.title}</option>)}</select></label><label>Skills <span className="field-note">(separate with commas)</span><input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. JavaScript, teamwork" /></label><div className="profile-progress"><span>Learning progress</span><b>{progress}% across enrolled courses</b><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="profile-form-actions"><button type="button" className="button outline" onClick={onClose}>Cancel</button><button type="submit" className="button primary" disabled={saving}>{saving ? "Saving…" : "Save changes"} {!saving && <Check size={15} />}</button></div></form></section></div>;
}

function EmptyState({ title, text, action, button }) { return <div className="empty-state"><div className="empty-icon"><BookOpen size={22} /></div><h3>{title}</h3><p>{text}</p><button className="button primary" onClick={action}>{button} <ArrowRight size={15} /></button></div>; }

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
