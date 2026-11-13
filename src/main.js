import { onAuthStateChanged } from 'firebase/auth';
import { auth, missingFirebaseConfig, signInWithGoogle, signOutUser } from './firebase.js';
import './style.css';

const root = document.querySelector('#app');
let currentUser = null;
let tasks = [];
let loading = false;
let notice = '';
let noticeType = 'error';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function showNotice(message, type = 'error') {
  notice = message;
  noticeType = type;
  render();
}

async function apiRequest(path = '', options = {}) {
  if (!currentUser) throw new Error('Sign in to continue.');
  const token = await currentUser.getIdToken();
  const response = await fetch(`/api/tasks${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try { message = (await response.json()).detail || message; } catch { /* Keep useful status fallback. */ }
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

async function loadTasks() {
  loading = true;
  render();
  try { tasks = await apiRequest(); notice = ''; }
  catch (error) { showNotice(error.message || 'Could not load tasks. Check your connection and try again.'); }
  finally { loading = false; render(); }
}

function renderTask(task) {
  const date = task.created_at?._seconds
    ? new Date(task.created_at._seconds * 1000)
    : new Date(task.created_at);
  const dateLabel = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  return `<article class="task-card">
    <div class="task-main"><div class="task-copy"><h3>${escapeHtml(task.title)}</h3>
      ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
      <span class="task-date">${dateLabel ? `Added ${dateLabel}` : 'Just added'}</span></div>
      <div class="task-controls"><span class="status status-${task.status.toLowerCase().replace(' ', '-')}">${escapeHtml(task.status)}</span>
        <label class="sr-only" for="status-${escapeHtml(task.id)}">Change status for ${escapeHtml(task.title)}</label>
        <select id="status-${escapeHtml(task.id)}" data-status="${escapeHtml(task.id)}" aria-label="Change status">
          ${['Planned', 'In Progress', 'Complete'].map(status => `<option ${task.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
        <button class="delete-button" data-delete="${escapeHtml(task.id)}" aria-label="Delete ${escapeHtml(task.title)}">Delete</button>
      </div></div></article>`;
}

function render() {
  if (!currentUser) {
    root.innerHTML = `<main class="auth-shell"><section class="auth-card">
      <div class="brand-mark">✓</div><p class="eyebrow">YOUR WORK, IN ORDER</p><h1>Make room for<br><span>what matters.</span></h1>
      <p class="intro">A simple place to capture tasks and keep your next steps clear.</p>
      ${missingFirebaseConfig.length ? `<div class="setup-note">Add your Firebase web keys to <code>.env</code> to enable sign in.</div>` : ''}
      ${notice ? `<p class="notice ${noticeType}" role="alert">${escapeHtml(notice)}</p>` : ''}
      <button class="google-button" id="signin" ${missingFirebaseConfig.length ? 'disabled' : ''}><span class="google-g">G</span>Continue with Google</button>
      <p class="auth-foot">Private by default · Your tasks stay yours</p></section></main>`;
    document.querySelector('#signin')?.addEventListener('click', async () => {
      try { await signInWithGoogle(); } catch (error) { showNotice(error.code === 'auth/popup-closed-by-user' ? 'Sign-in was cancelled.' : error.message || 'Google sign-in failed. Try again.'); }
    });
    return;
  }

  const activeCount = tasks.filter(task => task.status !== 'Complete').length;
  root.innerHTML = `<main class="app-shell"><header class="topbar"><a class="wordmark" href="#"><span class="brand-mark small">✓</span> daymark</a>
    <div class="profile"><span class="user-name">${escapeHtml(currentUser.displayName || currentUser.email)}</span><button class="text-button" id="signout">Sign out</button></div></header>
    <section class="workspace"><div class="page-heading"><div><p class="eyebrow">YOUR WORKSPACE</p><h1>Tasks <span class="count">${activeCount}</span></h1><p class="intro">A little progress, one task at a time.</p></div></div>
      ${notice ? `<p class="notice ${noticeType}" role="alert">${escapeHtml(notice)}</p>` : ''}
      <form id="task-form" class="composer"><div class="composer-fields"><input name="title" maxlength="120" placeholder="What needs to get done?" aria-label="Task title" required>
      <input name="description" maxlength="500" placeholder="Add a note (optional)" aria-label="Description"></div><button type="submit" class="add-button">Add task <span>＋</span></button></form>
      <div class="list-heading"><h2>All tasks</h2><span>${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}</span></div>
      ${loading ? '<div class="empty-state"><div class="loader"></div><p>Loading your tasks…</p></div>' : tasks.length ? `<div class="task-list">${tasks.map(renderTask).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">✳</div><h3>Your list starts here</h3><p>Add a task above and make today count.</p></div>`}
    </section><footer class="app-footer">Keep it simple. Keep moving.</footer></main>`;

  document.querySelector('#signout').addEventListener('click', async () => { try { await signOutUser(); } catch { showNotice('Could not sign out. Please try again.'); } });
  document.querySelector('#task-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const title = form.elements.title.value.trim();
    if (!title) { showNotice('Please enter a task title.'); form.elements.title.focus(); return; }
    const button = form.querySelector('button'); button.disabled = true;
    try { await apiRequest('', { method: 'POST', body: JSON.stringify({ title, description: form.elements.description.value.trim() }) }); notice = ''; await loadTasks(); }
    catch (error) { showNotice(error.message || 'Task could not be saved. Check your connection.'); }
    finally { button.disabled = false; }
  });
  document.querySelectorAll('[data-status]').forEach(select => select.addEventListener('change', async () => {
    select.disabled = true;
    try { await apiRequest(`/${encodeURIComponent(select.dataset.status)}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); notice = ''; await loadTasks(); }
    catch (error) { showNotice(error.message || 'Status could not be updated.'); }
    finally { select.disabled = false; }
  }));
  document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try { await apiRequest(`/${encodeURIComponent(button.dataset.delete)}`, { method: 'DELETE' }); tasks = tasks.filter(task => task.id !== button.dataset.delete); notice = ''; render(); }
    catch (error) { showNotice(error.message || 'Task could not be deleted.'); button.disabled = false; }
  }));
}

if (auth) onAuthStateChanged(auth, user => {
  currentUser = user;
  tasks = [];
  notice = '';
  render();
  if (user) loadTasks();
});
else render();
