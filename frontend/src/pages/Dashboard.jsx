import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';

const STATUS_COLOR = {
  todo:        { bg: '#f5f5f5', text: '#333' },
  in_progress: { bg: '#fff8dc', text: '#7a5c00' },
  done:        { bg: '#e8f5e9', text: '#1b5e20' },
};
const PRIORITY_COLOR = {
  low:    { bg: '#e3f0ff', text: '#1a3a6e' },
  medium: { bg: '#fff8dc', text: '#7a5c00' },
  high:   { bg: '#fde8e8', text: '#7a1a1a' },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const load = async () => {
    try {
      const res = await API.get('/dashboard');
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate('/login'); }
    }
  };

  useEffect(() => { load(); }, []);

  const createProject = async e => {
    e.preventDefault();
    setFormError('');
    try {
      await API.post('/projects', newProject);
      setNewProject({ name: '', description: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Error');
    }
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  if (!data) return <div style={styles.loading}>Loading...</div>;

  const { stats, overdueTasks, myPendingTasks, projects } = data;

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <div style={styles.nav}>
        <div style={styles.navInner}>
          <span style={styles.brand}>Team Task Manager</span>
          <div style={styles.navRight}>
            <span style={styles.navName}>{user.name} ({isAdmin ? 'Admin' : 'Member'})</span>
            <button style={styles.logoutBtn} onClick={logout}>Logout</button>
          </div>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.h1}>Dashboard</h1>
            <p style={styles.pageSubtitle}>Welcome back, {user.name}</p>
          </div>
          {isAdmin && (
            <button style={styles.primaryBtn} onClick={() => setShowForm(!showForm)}>
              + New Project
            </button>
          )}
        </div>

        {/* Member notice */}
        {!isAdmin && (
          <div style={styles.infoBox}>
            You are a <strong>Member</strong>. You can view projects you have been added to and update the status of tasks assigned to you. Only Admins can create projects and tasks.
          </div>
        )}

        {/* Create project form */}
        {showForm && (
          <div style={styles.formCard}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Create New Project</h3>
            {formError && <div style={styles.errorBox}>{formError}</div>}
            <form onSubmit={createProject}>
              <input style={styles.input} placeholder="Project name *"
                value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} required />
              <input style={{ ...styles.input, marginTop: 8 }} placeholder="Description (optional)"
                value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="submit" style={styles.primaryBtn}>Create</button>
                <button type="button" style={styles.ghostBtn} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Stats row */}
        <div style={styles.statsGrid}>
          {[
            { label: 'Projects',    value: stats.totalProjects },
            { label: 'Total Tasks', value: stats.totalTasks },
            { label: 'In Progress', value: stats.inProgress },
            { label: 'Completed',   value: stats.done },
            { label: 'Overdue',     value: stats.overdue },
            { label: 'My Tasks',    value: stats.myTasks },
          ].map(s => (
            <div key={s.label} style={styles.statCard}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={styles.twoCol}>
          {/* Overdue tasks */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Overdue Tasks</h2>
            {overdueTasks.length === 0
              ? <p style={styles.empty}>No overdue tasks.</p>
              : overdueTasks.map(task => (
                <div key={task.id} style={styles.taskCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>
                        {task.projectName} — Due {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                      {task.assignee && <div style={{ fontSize: 12, color: '#666' }}>{task.assignee.name}</div>}
                    </div>
                    <span style={{ ...styles.badge, background: PRIORITY_COLOR[task.priority]?.bg, color: PRIORITY_COLOR[task.priority]?.text }}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>

          {/* My pending tasks */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>My Pending Tasks</h2>
            {myPendingTasks.length === 0
              ? <p style={styles.empty}>No tasks assigned to you.</p>
              : myPendingTasks.map(task => (
                <div key={task.id} style={styles.taskCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>{task.projectName}</div>
                      {task.dueDate && <div style={{ fontSize: 12, color: '#666' }}>Due {new Date(task.dueDate).toLocaleDateString()}</div>}
                    </div>
                    <span style={{ ...styles.badge, background: STATUS_COLOR[task.status]?.bg, color: STATUS_COLOR[task.status]?.text }}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Projects */}
        <div style={{ marginTop: 28 }}>
          <h2 style={styles.sectionTitle}>My Projects</h2>
          {projects.length === 0
            ? <div style={styles.emptyState}>
                <p>{isAdmin ? 'No projects yet. Create your first one!' : 'You have not been added to any projects yet.'}</p>
                {!isAdmin && <p style={{ fontSize: 13, color: '#777' }}>Ask an admin to invite you to a project.</p>}
              </div>
            : <div style={styles.projectGrid}>
                {projects.map(p => {
                  const myRole = p.members.find(m => m.userId === user.id)?.role;
                  const tasks = p.tasks || [];
                  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
                  const doneCount = tasks.filter(t => t.status === 'done').length;
                  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

                  return (
                    <Link to={`/project/${p.id}`} key={p.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={styles.projectCard}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#ccc'}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{p.name}</h3>
                          <span style={{ ...styles.badge, background: '#eee', color: '#333', flexShrink: 0, marginLeft: 8, textTransform: 'capitalize' }}>
                            {myRole}
                          </span>
                        </div>
                        {p.description && <p style={{ color: '#555', fontSize: 13, margin: '0 0 10px' }}>{p.description}</p>}

                        {/* Progress bar */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 3 }}>
                            <span>Progress</span><span>{progress}%</span>
                          </div>
                          <div style={{ background: '#e5e5e5', height: 6 }}>
                            <div style={{ background: '#333', height: 6, width: `${progress}%`, transition: 'width 0.3s' }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                          <span>{tasks.length} tasks</span>
                          <span>{doneCount} done</span>
                          <span>{p.members.length} members</span>
                          {overdueCount > 0 && <span style={{ color: '#900' }}>{overdueCount} overdue</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
          }
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f0f0f0' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },
  nav: { background: '#fff', borderBottom: '1px solid #ccc', position: 'sticky', top: 0, zIndex: 10 },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontWeight: 700, fontSize: 16, color: '#111' },
  navRight: { display: 'flex', alignItems: 'center', gap: 12 },
  navName: { fontSize: 13, color: '#444' },
  logoutBtn: { padding: '5px 12px', background: 'none', border: '1px solid #ccc', cursor: 'pointer', fontSize: 13 },
  container: { maxWidth: 1100, margin: '0 auto', padding: '28px 20px' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  h1: { margin: 0, fontSize: 22, fontWeight: 700 },
  pageSubtitle: { color: '#666', margin: '4px 0 0', fontSize: 14 },
  infoBox: { background: '#fff', border: '1px solid #ccc', padding: '10px 14px', fontSize: 13, color: '#333', marginBottom: 20 },
  formCard: { background: '#fff', border: '1px solid #ccc', padding: 20, marginBottom: 20 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 24 },
  statCard: { background: '#fff', border: '1px solid #ccc', padding: '16px', textAlign: 'center' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  section: { background: '#fff', border: '1px solid #ccc', padding: 18 },
  sectionTitle: { margin: '0 0 14px', fontSize: 15, fontWeight: 700 },
  taskCard: { border: '1px solid #e5e5e5', padding: '10px 12px', marginBottom: 6, background: '#fafafa' },
  badge: { fontSize: 11, padding: '2px 7px', fontWeight: 600, border: '1px solid #ddd' },
  empty: { color: '#999', fontSize: 13, padding: '12px 0' },
  emptyState: { textAlign: 'center', padding: 40, color: '#666', background: '#fff', border: '1px solid #ccc' },
  projectGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  projectCard: { background: '#fff', border: '1px solid #ccc', padding: 16, cursor: 'pointer', transition: 'border-color 0.1s' },
  primaryBtn: { padding: '8px 16px', background: '#333', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  ghostBtn: { padding: '8px 16px', background: '#eee', color: '#333', border: '1px solid #ccc', cursor: 'pointer', fontSize: 13 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box' },
  errorBox: { background: '#fdd', border: '1px solid #f99', color: '#900', padding: '8px 12px', marginBottom: 10, fontSize: 13 },
};
