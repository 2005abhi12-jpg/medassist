import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Dashboard.css';

export default function Medications() {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMed, setEditingMed] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', dosage: '', instructions: '' });
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchMedications = useCallback(async () => {
    try {
      const res = await API.get('/medications');
      if (res.data.success) {
        setMedications(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch medications", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedications(); }, [fetchMedications]);

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this medication?")) return;
    try {
      await API.delete(`/medications/${id}`);
      showToast("Medication deactivated", "success");
      fetchMedications();
    } catch (err) {
      showToast(err.response?.data?.error?.message || "Error deleting medication", "error");
    }
  };

  const openEdit = (med) => {
    setEditingMed(med._id);
    setEditForm({ name: med.name, dosage: med.dosage, instructions: med.instructions || '' });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await API.patch(`/medications/${editingMed}`, editForm);
      showToast("Medication updated", "success");
      setEditingMed(null);
      fetchMedications();
    } catch (err) {
      showToast(err.response?.data?.error?.message || "Error updating medication", "error");
    }
  };

  return (
    <div className="dashboard-container">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <header className="dashboard-header">
        <div className="dashboard-greeting" style={{ color: 'var(--text-heading)' }}>💊 My Medications</div>
        <div className="header-actions">
          <button className="btn-add" onClick={() => navigate('/add')}>➕ Add Medication</button>
          <button className="btn-logout" onClick={() => navigate('/patient')}>Back to Dashboard</button>
        </div>
      </header>

      <main className="dashboard-content">
        {loading ? (
          <div className="empty-state" style={{ background: 'var(--bg-card)', padding: 40, borderRadius: 12 }}>
            Loading medications…
          </div>
        ) : medications.length === 0 ? (
          <div className="empty-state" style={{ background: 'var(--bg-card)', padding: 40, borderRadius: 12 }}>
            No medications found. Add one to get started!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {medications.map(med => (
              <div key={med._id} className="med-card">
                <div className="med-header">
                  <div className="med-name">💊 {med.name}</div>
                  <div className="med-actions">
                    <span onClick={() => openEdit(med)} title="Edit">✏️</span>
                    <span onClick={() => handleDelete(med._id)} title="Delete">🗑️</span>
                  </div>
                </div>
                <div className="med-time">
                  <span>💊 {med.dosage}</span>
                </div>
                {med.instructions && (
                  <p style={{ fontSize: 13, color: 'var(--text-main)', marginTop: 8 }}>
                    📋 {med.instructions}
                  </p>
                )}
                <div className="status-badge" style={
                  med.isActive !== false
                    ? { background: '#dcfce7', color: '#16a34a' }
                    : { background: '#fef2f2', color: '#dc2626' }
                }>
                  {med.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingMed && (
        <div className="voice-modal">
          <div className="voice-content" style={{ textAlign: 'left' }}>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>✏️ Edit Medication</h2>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn-add" style={{ flex: 1, justifyContent: 'center' }}>Save</button>
                <button type="button" className="btn-logout" style={{ flex: 1 }} onClick={() => setEditingMed(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
