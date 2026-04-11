import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Dashboard.css'; // Reuse Dashboard styling

function CaregiverDashboard() {
  const [user, setUser] = useState({ name: "Caregiver" });
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [ptsRes, alertsRes] = await Promise.all([
        API.get('/caregiver/patients').catch(() => null),
        API.get('/caregiver/alerts').catch(() => null)
      ]);
      if (ptsRes?.data?.success) setPatients(ptsRes.data.data);
      if (alertsRes?.data?.success) setAlerts(alertsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) setUser({ name: storedName });
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const loadPatientDashboard = async (patientId) => {
    try {
      const res = await API.get(`/caregiver/patients/${patientId}/dashboard`);
      setPatientData(res.data.data);
      setSelectedPatient(patients.find(p => p._id === patientId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try { await API.post('/auth/logout').catch(() => {}); } finally {
      localStorage.clear();
      navigate('/');
    }
  };

  const acknowledgeAlert = async (id) => {
    await API.patch(`/caregiver/alerts/${id}/acknowledge`);
    fetchData();
  };

  const handleDeletePatient = async (patientId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this patient from your linked list?")) return;
    try {
      await API.delete(`/caregiver/patients/${patientId}`);
      if (selectedPatient && selectedPatient._id === patientId) {
        setSelectedPatient(null);
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to remove patient. Ensure checking your network.");
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-greeting">
          👋 Hello Caregiver <span>{user.name}</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => document.body.classList.toggle("dark-mode")}>🌙</button>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-grid">
          
          {/* Main Content Area */}
          <div className="meds-column">
            {selectedPatient && patientData ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 className="section-title">👤 {selectedPatient.name}'s Profile</h2>
                  <button className="btn-logout" onClick={() => setSelectedPatient(null)}>Close Profile</button>
                </div>
                
                <div className="stats-row" style={{ marginBottom: 20 }}>
                  <div className="stat-card adherence">
                    <div className="stat-title">ADHERENCE</div>
                    <div className="stat-value">{patientData.stats?.adherenceRate || 0}%</div>
                  </div>
                  <div className="stat-card taken">
                    <div className="stat-title">MEDICATIONS</div>
                    <div className="stat-value">{patientData.medications?.length || 0} active</div>
                  </div>
                </div>

                <div className="side-card">
                  <h3 className="side-title">Contact Information</h3>
                  <p><strong>Name:</strong> {selectedPatient.name}</p>
                  <p><strong>Phone:</strong> {selectedPatient.phone || 'N/A'}</p>
                  <p><strong>Language:</strong> {selectedPatient.language || 'en'}</p>
                </div>

                <div className="side-card" style={{ marginTop: 20 }}>
                  <h3 className="side-title">Active Medications</h3>
                  {patientData.medications?.length === 0 ? (
                    <div className="empty-state">No active medications</div>
                  ) : (
                    patientData.medications.map(med => (
                      <div key={med._id} style={{ padding: 10, borderBottom: '1px solid var(--border-color)' }}>
                        <strong>💊 {med.name}</strong> - {med.dosage}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="section-title">👥 My Patients</h2>
                {loading ? <div className="empty-state">Loading...</div> : patients.length === 0 ? (
                  <div className="empty-state">You have no linked patients yet.</div>
                ) : (
                  patients.map(p => (
                    <div key={p._id} className="med-card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => loadPatientDashboard(p._id)}>
                      <div className="med-header">
                        <div className="med-name">👤 {p.name}</div>
                        <span onClick={(e) => handleDeletePatient(p._id, e)} title="Remove Patient" style={{ fontSize: '18px', zIndex: 10 }}>🗑️</span>
                      </div>
                      <div className="med-time">
                        <span>📱 {p.phone || 'No phone'}</span>
                        <span style={{ color: '#0ea5e9', fontWeight: 500 }}>View Profile ➔</span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* Right Sidebar - Alerts */}
          <div className="info-column">
            <div className="side-card">
              <h2 className="side-title">🚨 Patient Alerts</h2>
              {alerts.length === 0 ? (
                <div className="empty-state">No active alerts. All patients are safe.</div>
              ) : (
                alerts.map(al => (
                  <div key={al._id} style={{ display: 'flex', gap: 10, padding: 10, borderBottom: '1px solid var(--border-color)', fontSize: '13px', opacity: al.isAcknowledged ? 0.6 : 1 }}>
                    <div style={{ padding: 6, background: '#fee2e2', color: '#ef4444', height: 'fit-content', borderRadius: '50%' }}>⚠️</div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: '#ef4444' }}>{al.message}</strong><br/>
                      <span style={{ fontSize: '11px', color: 'var(--text-main)' }}>{new Date(al.createdAt).toLocaleString()}</span>
                    </div>
                    {!al.isAcknowledged && (
                      <button onClick={() => acknowledgeAlert(al._id)} style={{ padding: '4px 8px', fontSize: 11, background: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: 6, cursor: 'pointer', height: 'fit-content' }}>
                        Ack
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default CaregiverDashboard;
