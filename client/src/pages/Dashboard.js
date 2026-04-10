import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState({ name: "Patient" });
  const [stats, setStats] = useState({ adherenceRate: 0, taken: 0, missed: 0 });
  const [reminders, setReminders] = useState([]);
  const [medications, setMedications] = useState([]);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Listening...");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editingMed, setEditingMed] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', dosage: '', instructions: '' });
  const navigate = useNavigate();

  // Toast helper
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch stats
      const statsRes = await API.get('/adherence/stats').catch(() => null);
      if (statsRes?.data?.success) {
        setStats(statsRes.data.data || { adherenceRate: 0, taken: 0, missed: 0 });
      }

      // Fetch reminders (due + upcoming)
      const [dueRes, upcomingRes] = await Promise.all([
        API.get('/reminders/due').catch(() => ({ data: { data: [] } })),
        API.get('/reminders/upcoming').catch(() => ({ data: { data: [] } }))
      ]);

      const due = dueRes.data?.data || [];
      const upcoming = upcomingRes.data?.data || [];
      const combined = [...due, ...upcoming];
      const unique = Array.from(new Map(combined.map(item => [item._id, item])).values());
      setReminders(unique);

      // Fetch medications list
      const medsRes = await API.get('/medications').catch(() => null);
      if (medsRes?.data?.success) {
        setMedications(medsRes.data.data || []);
      }

      // Fetch history logs
      const historyRes = await API.get('/adherence?limit=5').catch(() => null);
      if (historyRes?.data?.success) {
        setHistory(historyRes.data.data || []);
      }

      // Fetch caregiver alerts
      const alertsRes = await API.get('/alerts').catch(() => null);
      if (alertsRes?.data?.success) {
        setAlerts(alertsRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) setUser({ name: storedName });
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Frontend Alarm & Missed Dose Refetch (polls every 5s)
  useEffect(() => {
    const alarmAudio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    const interval = setInterval(() => {
      // 1. Check for triggered reminders to ring!
      reminders.forEach(rem => {
        if (rem.status === 'TRIGGERED' && !rem.alarmPlayed) {
          try { alarmAudio.play(); } catch(e){}
          const msg = new SpeechSynthesisUtterance(`Reminder! It is time to take ${rem.medicationId?.name || 'your medication'}.`);
          window.speechSynthesis.speak(msg);
          rem.alarmPlayed = true;
          setActiveAlarm(rem);

          // Auto-hide the alarm modal after 60 seconds (to sync with backend Missed state)
          setTimeout(() => {
            setActiveAlarm(current => (current && current._id === rem._id) ? null : current);
          }, 60000);
        }
      });
      // 2. Poll dashboard softly for data changes (like new Missed dose)
      fetchDashboardData();
    }, 5000);
    return () => clearInterval(interval);
  }, [reminders, fetchDashboardData]);

  const handleLogout = async () => {
    try {
      await API.post('/auth/logout').catch(() => {});
    } finally {
      localStorage.clear();
      navigate('/');
    }
  };

  // ─── Reminder actions ──────────────────────────────
  const handleAction = async (id, actionType) => {
    try {
      await API.post(`/reminders/${id}/${actionType}`);
      showToast(
        actionType === 'confirm' ? '✅ Dose confirmed!' :
        actionType === 'snooze' ? '⏰ Reminder snoozed' :
        '❌ Dose dismissed',
        actionType === 'confirm' ? 'success' : actionType === 'snooze' ? 'warning' : 'error'
      );
      fetchDashboardData();
    } catch (err) {
      const message = err.response?.data?.error?.message || `Failed to ${actionType}`;
      showToast(message, 'error');
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reminder?")) return;
    try {
      await API.delete(`/reminders/${id}`);
      showToast('🗑️ Reminder deleted', 'success');
      fetchDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Error deleting reminder', 'error');
    }
  };

  // ─── Medication CRUD ───────────────────────────────
  const handleDeleteMedication = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this medication?")) return;
    try {
      await API.delete(`/medications/${id}`);
      showToast('🗑️ Medication deactivated', 'success');
      fetchDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Error deleting medication', 'error');
    }
  };

  const openEditMedication = (rem) => {
    if(!rem || !rem.medicationId?._id) return;
    setEditingMed(rem);
    let timeString = '';
    if (rem.scheduledTime) {
      const d = new Date(rem.scheduledTime);
      timeString = d.toTimeString().slice(0, 5); // "HH:MM"
    }
    setEditForm({ name: rem.medicationId.name, dosage: rem.medicationId.dosage, instructions: rem.medicationId.instructions || '', time: timeString });
  };

  const handleEditMedication = async (e) => {
    e.preventDefault();
    try {
      await API.patch(`/medications/${editingMed.medicationId._id}`, {
        name: editForm.name,
        dosage: editForm.dosage,
        instructions: editForm.instructions
      });

      if (editForm.time) {
        const newDate = new Date(editingMed.scheduledTime || Date.now());
        const [hours, mins] = editForm.time.split(':');
        newDate.setHours(hours, mins, 0, 0);
        await API.patch(`/reminders/${editingMed._id}`, { scheduledTime: newDate });
      }

      showToast('✏️ Medication updated', 'success');
      setEditingMed(null);
      fetchDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Error updating medication', 'error');
    }
  };

  // ─── Voice assistant ───────────────────────────────
  const handleVoiceAssistant = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Your browser doesn't support Speech Recognition. Use Chrome.", "error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceResponse("");
      setVoiceStatus("Listening...");
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceStatus("Thinking...");

      try {
        const res = await API.post('/voice/intent', { transcript });
        const aiResponse = res.data.data.response;

        const utterance = new SpeechSynthesisUtterance(aiResponse);
        window.speechSynthesis.speak(utterance);

        setVoiceStatus("Response:");
        setVoiceResponse(aiResponse);
        fetchDashboardData();
      } catch (err) {
        console.error("Voice API error", err);
        setVoiceStatus("Error");
        setVoiceResponse("Sorry, MedAssist couldn't process that. Please try again.");
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setVoiceStatus("Error");
      setVoiceResponse("Sorry, there was an issue picking up your microphone.");
    };

    recognition.onend = () => {
      // If we never got a result and still in "Listening..." state
      if (voiceStatus === "Listening...") {
        setVoiceStatus("Error");
        setVoiceResponse("No speech detected. Please try again.");
      }
    };

    recognition.start();
  };

  return (
    <div className="dashboard-container">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-greeting">
          👋 Hello <span>{user.name}</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => showToast("No new notifications", "info")}>🔔</button>
          <button className="icon-btn" onClick={() => document.body.classList.toggle("dark-mode")}>🌙</button>
          <button className="btn-add" onClick={() => navigate('/add')}>➕ Add Medication</button>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card adherence">
            <div className="stat-title">ADHERENCE</div>
            <div className="stat-value">{stats.adherenceRate || 0}%</div>
          </div>
          <div className="stat-card taken">
            <div className="stat-title">TAKEN</div>
            <div className="stat-value">{stats.taken || 0}</div>
          </div>
          <div className="stat-card missed">
            <div className="stat-title">MISSED</div>
            <div className="stat-value">{stats.missed || 0}</div>
          </div>
        </div>

        {/* Voice Banner */}
        <div className="hero-banner">
          <h3>Ask anything about your medications</h3>
          <button className="btn-ask" onClick={handleVoiceAssistant}>🎙️ Ask MedAssist</button>
        </div>

        {/* Two-column grid */}
        <div className="dashboard-grid">

          {/* Left — Today's Reminders */}
          <div className="meds-column">
            <h2 className="section-title">📅 Today's Reminders</h2>

            {loading ? (
              <div className="empty-state" style={{ background: 'var(--bg-card)', padding: 30, borderRadius: 12 }}>
                Loading…
              </div>
            ) : reminders.filter(r => !['TAKEN', 'MISSED'].includes(r.status)).length === 0 ? (
              <div className="empty-state" style={{ background: 'var(--bg-card)', padding: 30, borderRadius: 12 }}>
                No reminders for today. All caught up! 🎉
              </div>
            ) : (
              reminders.filter(r => !['TAKEN', 'MISSED'].includes(r.status)).map(rem => {
                const isActionable = ['TRIGGERED', 'SCHEDULED', 'SNOOZED'].includes(rem.status);
                const medName = rem.medicationId?.name || "Unknown Med";
                const formattedDate = new Date(rem.scheduledTime).toLocaleDateString();
                const formattedTime = new Date(rem.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={rem._id} className="med-card" style={{ opacity: 1 }}>
                    <div className="med-header">
                      <div className="med-name">💊 {medName}</div>
                      <div className="med-actions">
                        {rem.medicationId && (
                          <span onClick={() => openEditMedication(rem)} title="Edit medication" style={{ marginRight: '12px' }}>✏️</span>
                        )}
                        <span onClick={() => handleDeleteReminder(rem._id)} title="Delete reminder">🗑️</span>
                      </div>
                    </div>

                    <div className="med-time">
                      <span>📅 {formattedDate}</span>
                      <span>⏰ {formattedTime}</span>
                    </div>

                    <div style={{ clear: 'both' }}></div>

                    <div
                      className="status-badge"
                      style={
                        rem.status === 'TAKEN' ? { background: '#dcfce7', color: '#16a34a' } :
                        rem.status === 'MISSED' ? { background: '#fef2f2', color: '#dc2626' } :
                        rem.status === 'TRIGGERED' ? { background: '#fef3c7', color: '#d97706' } :
                        rem.status === 'SNOOZED' ? { background: '#e0f2fe', color: '#0284c7' } :
                        { background: '#f1f5f9', color: '#64748b' }}
                    >
                      {rem.status}
                    </div>

                    <div className="action-buttons" style={!isActionable ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
                      <button className="action-btn btn-taken" onClick={() => handleAction(rem._id, 'confirm')}>✅ Taken</button>
                      <button className="action-btn btn-snooze" onClick={() => handleAction(rem._id, 'snooze')}>💤 Snooze</button>
                      <button className="action-btn btn-not-taken" onClick={() => handleAction(rem._id, 'dismiss')}>❌ Not Taken</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right — Medications + Info */}
          <div className="info-column">


            <div className="side-card">
              <h2 className="side-title">📜 Patient History</h2>
              {history.length === 0 ? (
                <div className="empty-state">Check back later for history logs once you start taking medications!</div>
              ) : (
                history.map(log => {
                  const name = log.medicationId?.name || "Medication";
                  const date = new Date(log.actualTime || log.scheduledTime).toLocaleDateString();
                  const time = new Date(log.actualTime || log.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={log._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                      <div>
                        <strong>{name}</strong><br/>
                        <span style={{ color: 'var(--text-main)', fontSize: '12px' }}>{date} at {time}</span>
                      </div>
                      <div style={{
                        padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', height: 'fit-content',
                        background: log.status === 'TAKEN' ? '#dcfce7' : log.status === 'MISSED' ? '#fef2f2' : '#e0f2fe',
                        color: log.status === 'TAKEN' ? '#16a34a' : log.status === 'MISSED' ? '#dc2626' : '#0284c7'
                      }}>
                        {log.status === 'TAKEN' ? '✅ TAKEN' : log.status === 'MISSED' ? '❌ MISSED' : '💤 SNOOZED'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="side-card">
              <h2 className="side-title">📲 Caregiver Alerts</h2>
              {alerts.length === 0 ? (
                <div className="empty-state">No SMS alerts triggered yet.</div>
              ) : (
                alerts.map(al => (
                  <div key={al._id} style={{ display: 'flex', gap: 10, padding: 10, borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <div style={{ padding: 6, background: '#fee2e2', color: '#ef4444', height: 'fit-content', borderRadius: '50%' }}>⚠️</div>
                    <div>
                      <strong style={{ color: '#ef4444' }}>{al.message}</strong><br/>
                      <span style={{ fontSize: '11px', color: 'var(--text-main)' }}>{new Date(al.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Voice Modal */}
      {isListening && (
        <div className="voice-modal">
          <div className="voice-content">
            <h2 style={{ marginTop: 0 }}>MedAssist is {voiceStatus}</h2>
            {voiceStatus === "Listening..." && (
              <p style={{ color: 'var(--text-main)' }}>Speak now to log your medication or ask a question.</p>
            )}

            {(voiceStatus === "Listening..." || voiceStatus === "Thinking...") && (
              <div className="voice-waves">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            )}

            {voiceResponse && (
              <div style={{
                marginTop: 20, marginBottom: 20, padding: 15,
                background: 'var(--input-bg)', borderRadius: 10,
                color: 'var(--text-heading)', fontWeight: 500
              }}>
                "{voiceResponse}"
              </div>
            )}

            <button className="btn-logout" onClick={() => setIsListening(false)}>
              {voiceResponse || voiceStatus === "Error" ? "Close" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Edit Medication Modal */}
      {editingMed && (
        <div className="voice-modal">
          <div className="voice-content" style={{ textAlign: 'left' }}>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>✏️ Edit Medication</h2>
            <form onSubmit={handleEditMedication} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="edit-label">Name</label>
                <input className="med-input" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="edit-label">Dosage</label>
                <input className="med-input" value={editForm.dosage}
                  onChange={(e) => setEditForm({ ...editForm, dosage: e.target.value })} />
              </div>
              <div>
                <label className="edit-label">Instructions</label>
                <input className="med-input" value={editForm.instructions}
                  onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })} />
              </div>
              <div>
                <label className="edit-label">Time</label>
                <input type="time" className="med-input" value={editForm.time || ''}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn-add" style={{ flex: 1, justifyContent: 'center' }}>Save</button>
                <button type="button" className="btn-logout" style={{ flex: 1 }} onClick={() => setEditingMed(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alarm Modal */}
      {activeAlarm && (
        <div className="voice-modal" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999 }}>
          <div className="voice-content" style={{ textAlign: 'center', border: '3px solid #ef4444', boxShadow: '0 4px 30px rgba(239, 68, 68, 0.4)' }}>
            <h1 style={{ color: '#ef4444', fontSize: '38px', margin: '0 0 10px 0' }}>🚨 ALARM! 🚨</h1>
            <h2 style={{ fontSize: '24px', margin: '10px 0 30px 0', color: 'var(--text-heading)' }}>
              Time to take <strong>{activeAlarm.medicationId?.name}</strong>!
            </h2>
            <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="action-btn btn-taken" 
                style={{ fontSize: 18, padding: '14px 28px', flex: 1, minWidth: '120px' }}
                onClick={() => { handleAction(activeAlarm._id, 'confirm'); setActiveAlarm(null); }}>
                ✅ Taken
              </button>
              <button 
                className="action-btn btn-snooze" 
                style={{ fontSize: 18, padding: '14px 28px', flex: 1, minWidth: '120px' }}
                onClick={() => { handleAction(activeAlarm._id, 'snooze'); setActiveAlarm(null); }}>
                💤 Snooze
              </button>
              <button 
                className="btn-logout" 
                style={{ fontSize: 18, padding: '14px 28px', flex: 1, minWidth: '120px', background: 'transparent', color: '#64748b' }}
                onClick={() => setActiveAlarm(null)}>
                🔇 Mute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
