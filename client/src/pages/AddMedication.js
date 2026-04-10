import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Dashboard.css';

export default function AddMedication() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', dosage: '', startDate: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/medications', formData);
      navigate('/patient');
    } catch (err) {
      alert("Failed to add medication. Ensure your backend is running and the route exists.");
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-greeting" style={{ color: 'var(--text-heading)' }}>➕ Add New Medication</div>
        <button className="btn-logout" onClick={() => navigate('/patient')}>Back to Dashboard</button>
      </header>
      <main className="dashboard-content">
        <div className="med-card" style={{ maxWidth: '500px', margin: '40px auto', padding: '40px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>Medication Name</label>
              <input type="text" className="med-input" placeholder="e.g. Metformin" required 
                onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>Dosage (e.g. 500mg)</label>
              <input type="text" className="med-input" placeholder="e.g. 500mg" required 
                onChange={(e) => setFormData({...formData, dosage: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>Time</label>
              <input type="time" className="med-input" required 
                onChange={(e) => setFormData({...formData, time: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>Start Date</label>
              <input type="date" className="med-input" required 
                onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <button className="btn-add" style={{ justifyContent: 'center', marginTop: '10px' }} type="submit">
              Save Medication
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
