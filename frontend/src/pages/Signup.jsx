import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/signup', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.sub}>Join Project Tracker</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={submit}>
          <label style={styles.label}>Full Name</label>
          <input style={styles.input} type="text" placeholder="Your name"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />

          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" placeholder="you@email.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />

          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" placeholder="Min 6 characters"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />

          <label style={styles.label}>Role</label>
          <div style={styles.roleRow}>
            {['member', 'admin'].map(r => (
              <label key={r} style={styles.roleOption}>
                <input type="radio" name="role" value={r} checked={form.role === r}
                  onChange={() => setForm({ ...form, role: r })} />
                {' '}
                <strong style={{ textTransform: 'capitalize' }}>{r}</strong>
                <span style={{ color: '#666', fontSize: 12 }}>
                  {' '}— {r === 'admin' ? 'Create & manage projects' : 'Work on assigned tasks'}
                </span>
              </label>
            ))}
          </div>

          <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p style={styles.foot}>Already have an account? <Link to="/login" style={styles.link}>Login</Link></p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { background: '#fff', border: '1px solid #ccc', padding: '32px 28px', width: '100%', maxWidth: 400 },
  title: { margin: '0 0 4px', fontSize: 20, fontWeight: 700 },
  sub: { color: '#555', margin: '0 0 20px', fontSize: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4, marginTop: 12 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box' },
  roleRow: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 },
  roleOption: { display: 'block', fontSize: 13, cursor: 'pointer', padding: '6px 0' },
  btn: { width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 18 },
  errorBox: { background: '#fdd', border: '1px solid #f99', color: '#900', padding: '8px 12px', marginBottom: 14, fontSize: 13 },
  foot: { textAlign: 'center', marginTop: 18, fontSize: 14, color: '#555' },
  link: { color: '#333', fontWeight: 600 },
};
