import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../api';

const STATUS_OPTIONS = ['todo', 'in_progress', 'done'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

const STATUS_STYLE = {
  todo:        { bg: '#f5f5f5', text: '#333',    label: 'To Do' },
  in_progress: { bg: '#fff8dc', text: '#7a5c00', label: 'In Progress' },
  done:        { bg: '#e8f5e9', text: '#1b5e20', label: 'Done' },
};
const PRIORITY_STYLE = {
  low:    { bg: '#e3f0ff', text: '#1a3a6e' },
  medium: { bg: '#fff8dc', text: '#7a5c00' },
  high:   { bg: '#fde8e8', text: '#7a1a1a' },
};

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [project, setProject] = useState(null);
  const [tab, setTab] = useState('tasks');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigneeId: '', dueDate: '', priority: 'medium' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      const res = await API.get(`/projects/${id}`);
      setProject(res.data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/');
    }
  };

  useEffect(() => { load(); }, [id]);

  if (!project) return <div style={styles.loading}>Loading...</div>;

  const myMembership = project.members.find(m => m.userId === user.id);
  const myRole = myMembership?.role;
  const isAdmin = myRole === 'admin';
  const tasks = project.tasks || [];
  const now = new Date();

  const filteredTasks = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 3000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
  };

  const createTask = async e => {
    e.preventDefault();
    try {
      await API.post('/tasks', {
        ...taskForm,
        projectId: parseInt(id),
        assigneeId: taskForm.assigneeId || null,
        dueDate: taskForm.dueDate || null,
      });
      setTaskForm({ title: '', description: '', assigneeId: '', dueDate: '', priority: 'medium' });
      setShowTaskForm(false);
      flash('Task created!');
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Error creating task', true);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await API.patch(`/tasks/${taskId}`, { status });
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Error updating task', true);
    }
  };

  const deleteTask = async taskId => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await API.delete(`/tasks/${taskId}`);
      flash('Task deleted');
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Error', true);
    }
  };

  const inviteMember = async e => {
    e.preventDefault();
    try {
      await API.post('/members/invite', { email: inviteEmail, projectId: parseInt(id), role: inviteRole });
      setInviteEmail('');
      flash('Member added!');
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Error', true);
    }
  };

  const removeMember = async memberId => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await API.delete(`/members/${memberId}`);
      flash('Member removed');
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Error', true);
    }
  };

  const totalDone = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length;

  return (
    <div style={styles.page}>
      {/* Nav */}
      <div style={styles.nav}>
        <div style={styles.navInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/" style={{ color: '#333', textDecoration: 'none', fontSize: 13 }}>← Dashboard</Link>
            <span style={{ color: '#aaa' }}>/</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{project.name}</span>
          </div>
          <span style={{ fontSize: 13, color: '#444', textTransform: 'capitalize' }}>
            {myRole}
          </span>
        </div>
      </div>

      <div style={styles.container}>
        {project.description && <p style={{ color: '#555', fontSize: 14, margin: '0 0 18px' }}>{project.description}</p>}

        {/* Flash messages */}
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {/* Stats row */}
        <div style={styles.statsRow}>
          {Object.entries(STATUS_STYLE).map(([status, s]) => (
            <div key={status}
              style={{ ...styles.statPill, background: s.bg, border: filterStatus === status ? '2px solid #333' : '2px solid transparent', cursor: 'pointer' }}
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}>
              <span style={{ fontWeight: 700, fontSize: 18, color: s.text }}>{tasks.filter(t => t.status === status).length}</span>
              <span style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{s.label}</span>
            </div>
          ))}
          {overdueCount > 0 && (
            <div style={{ ...styles.statPill, background: '#fde8e8', border: '2px solid transparent' }}>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#7a1a1a' }}>{overdueCount}</span>
              <span style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Overdue</span>
            </div>
          )}
          <div style={{ ...styles.statPill, background: '#f5f5f5', border: '2px solid transparent', flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4, width: '100%' }}>
              <span>Progress</span><span>{progress}%</span>
            </div>
            <div style={{ background: '#ddd', height: 6, width: '100%' }}>
              <div style={{ background: '#333', height: 6, width: `${progress}%`, transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>

        {/* Member access info */}
        {!isAdmin && (
          <div style={styles.infoBox}>
            As a <strong>Member</strong>, you can update the status of tasks assigned to you. Only admins can create, edit, or delete tasks.
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabBar}>
          {[
            { key: 'tasks', label: `Tasks (${tasks.length})` },
            { key: 'team',  label: `Team (${project.members.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TASKS TAB */}
        {tab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setFilterStatus('all')}
                  style={{ ...styles.filterBtn, ...(filterStatus === 'all' ? styles.filterBtnActive : {}) }}>All</button>
                {STATUS_OPTIONS.map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{ ...styles.filterBtn, ...(filterStatus === s ? styles.filterBtnActive : {}) }}>
                    {STATUS_STYLE[s].label}
                  </button>
                ))}
              </div>
              {isAdmin && (
                <button style={styles.primaryBtn} onClick={() => setShowTaskForm(!showTaskForm)}>
                  + Add Task
                </button>
              )}
            </div>

            {/* Task create form */}
            {showTaskForm && isAdmin && (
              <div style={styles.formCard}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Create New Task</h3>
                <form onSubmit={createTask}>
                  <div style={styles.formGrid}>
                    <div>
                      <label style={styles.label}>Title *</label>
                      <input style={styles.input} placeholder="Task title"
                        value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
                    </div>
                    <div>
                      <label style={styles.label}>Assign To</label>
                      <select style={styles.input} value={taskForm.assigneeId}
                        onChange={e => setTaskForm({ ...taskForm, assigneeId: e.target.value })}>
                        <option value="">Unassigned</option>
                        {project.members.map(m => (
                          <option key={m.userId} value={m.userId}>{m.user.name} ({m.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Priority</label>
                      <select style={styles.input} value={taskForm.priority}
                        onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                        {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Due Date</label>
                      <input style={styles.input} type="date"
                        value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={styles.label}>Description</label>
                    <input style={styles.input} placeholder="Optional description"
                      value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button type="submit" style={styles.primaryBtn}>Create Task</button>
                    <button type="button" style={styles.ghostBtn} onClick={() => setShowTaskForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Task list */}
            {filteredTasks.length === 0
              ? <div style={styles.emptyState}><p>No tasks {filterStatus !== 'all' ? `with status "${filterStatus.replace('_', ' ')}"` : 'yet'}.</p></div>
              : filteredTasks.map(task => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'done';
                  const isAssignedToMe = task.assigneeId === user.id;
                  const canChangeStatus = isAdmin || isAssignedToMe;

                  return (
                    <div key={task.id} style={{ ...styles.taskCard, borderLeft: `4px solid ${isOverdue ? '#c00' : '#ccc'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</span>
                            <span style={{ ...styles.badge, background: PRIORITY_STYLE[task.priority]?.bg, color: PRIORITY_STYLE[task.priority]?.text }}>
                              {task.priority}
                            </span>
                            {isOverdue && <span style={{ ...styles.badge, background: '#fde8e8', color: '#900' }}>overdue</span>}
                            {isAssignedToMe && !isAdmin && <span style={{ ...styles.badge, background: '#eee', color: '#333' }}>assigned to me</span>}
                          </div>
                          {task.description && <p style={{ color: '#555', fontSize: 13, margin: '4px 0 0' }}>{task.description}</p>}
                          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: '#777', flexWrap: 'wrap' }}>
                            {task.assignee
                              ? <span>{task.assignee.name}</span>
                              : <span style={{ color: '#c60' }}>Unassigned</span>
                            }
                            {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          {canChangeStatus ? (
                            <select
                              value={task.status}
                              onChange={e => updateTaskStatus(task.id, e.target.value)}
                              style={{ ...styles.statusSelect, background: STATUS_STYLE[task.status]?.bg, color: STATUS_STYLE[task.status]?.text }}>
                              {STATUS_OPTIONS.map(s => (
                                <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ ...styles.badge, background: STATUS_STYLE[task.status]?.bg, color: STATUS_STYLE[task.status]?.text }}>
                              {STATUS_STYLE[task.status]?.label}
                            </span>
                          )}
                          {isAdmin && (
                            <button onClick={() => deleteTask(task.id)} style={styles.deleteBtn}>Delete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        )}

        {/* TEAM TAB */}
        {tab === 'team' && (
          <div>
            {isAdmin && (
              <div style={styles.formCard}>
                <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>Invite Member</h3>
                <p style={{ fontSize: 13, color: '#777', margin: '0 0 12px' }}>The person must already have an account before you can invite them.</p>
                <form onSubmit={inviteMember}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input style={{ ...styles.input, flex: 1, minWidth: 180 }} type="email"
                      placeholder="Email address" value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)} required />
                    <select style={{ ...styles.input, width: 120 }} value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button type="submit" style={styles.primaryBtn}>Invite</button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {project.members.map(m => {
                const memberTasks = tasks.filter(t => t.assigneeId === m.userId);
                const doneTasks = memberTasks.filter(t => t.status === 'done').length;
                return (
                  <div key={m.id} style={styles.memberCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={styles.avatar}>{m.user.name[0].toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              {m.user.name}
                              {m.userId === user.id && <span style={{ color: '#666', fontSize: 12, marginLeft: 6 }}>(you)</span>}
                            </div>
                            <div style={{ fontSize: 12, color: '#777' }}>{m.user.email}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#777', marginTop: 5, paddingLeft: 42 }}>
                          {memberTasks.length} tasks assigned — {doneTasks} done
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ ...styles.badge, background: '#eee', color: '#333', textTransform: 'capitalize' }}>
                          {m.role}
                        </span>
                        {isAdmin && m.userId !== user.id && (
                          <button onClick={() => removeMember(m.id)} style={styles.deleteBtn}>Remove</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f0f0f0' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },
  nav: { background: '#fff', borderBottom: '1px solid #ccc', position: 'sticky', top: 0, zIndex: 10 },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' },
  statsRow: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  statPill: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 18px', minWidth: 70 },
  infoBox: { background: '#fff', border: '1px solid #ccc', padding: '10px 14px', fontSize: 13, color: '#333', marginBottom: 18 },
  tabBar: { display: 'flex', borderBottom: '2px solid #ccc', marginBottom: 18 },
  tab: { padding: '9px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#555', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive: { color: '#111', fontWeight: 700, borderBottom: '2px solid #111' },
  filterBtn: { padding: '5px 11px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#444' },
  filterBtnActive: { background: '#333', color: '#fff', borderColor: '#333' },
  formCard: { background: '#fff', border: '1px solid #ccc', padding: 18, marginBottom: 18 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box' },
  taskCard: { background: '#fff', border: '1px solid #ddd', padding: '12px 14px', marginBottom: 8 },
  statusSelect: { padding: '4px 7px', border: '1px solid #ccc', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  deleteBtn: { padding: '4px 10px', background: '#fde8e8', color: '#900', border: '1px solid #fcc', cursor: 'pointer', fontSize: 12 },
  badge: { fontSize: 11, padding: '2px 7px', fontWeight: 600, border: '1px solid #ddd' },
  memberCard: { background: '#fff', border: '1px solid #ccc', padding: '14px 16px' },
  avatar: { width: 32, height: 32, background: '#ddd', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  primaryBtn: { padding: '8px 16px', background: '#333', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  ghostBtn: { padding: '8px 16px', background: '#eee', color: '#333', border: '1px solid #ccc', cursor: 'pointer', fontSize: 13 },
  emptyState: { textAlign: 'center', padding: 50, color: '#777', background: '#fff', border: '1px solid #ccc' },
  errorBox: { background: '#fdd', border: '1px solid #f99', color: '#900', padding: '8px 12px', marginBottom: 10, fontSize: 13 },
  successBox: { background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#1b5e20', padding: '8px 12px', marginBottom: 10, fontSize: 13 },
};
