import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './ApplicationsTable.css';

const ApplicationsTable = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  useEffect(() => {
    // Dev: localhost; Prod: your backend Vercel URL
    const API_BASE = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5000'
      : 'https://zc-chess-club.vercel.app';  // ← Replace with your actual backend URL

    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE}/api/applications`);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to fetch: ${response.status} – ${text.slice(0, 100)}`);
        }
        const data = await response.json();
        setApplications(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const PrettyRoleData = ({ data }) => {
    const formatKey = (key) =>
      key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const renderData = (obj) => {
      if (obj === null || obj === undefined)
        return <em style={{ color: '#666' }}>Not provided</em>;

      if (Array.isArray(obj)) {
        return obj.map((item, i) => (
          <div key={i} className="pretty-role-array-item">
            <h4>Entry #{i + 1}</h4>
            {renderData(item)}
          </div>
        ));
      }

      if (typeof obj === 'object' && obj !== null) {
        return Object.entries(obj).map(([k, v]) => (
          <div key={k} className="pretty-field">
            <strong>{formatKey(k)}:</strong>
            <div style={{ paddingLeft: '15px' }}>{renderData(v)}</div>
          </div>
        ));
      }

      return <span>{obj}</span>;
    };

    return (
      <div className="pretty-role-data">
        {Object.keys(data || {}).length === 0 ? (
          <p style={{ color: '#caba91', fontStyle: 'italic' }}>
            No role-specific data provided.
          </p>
        ) : (
          renderData(data)
        )}
      </div>
    );
  };

  const openModal = (data) => {
    setSelectedData(data);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedData(null);
  };

  if (isLoading) {
    return (
      <div className="app-container applications-table-page">
        <Header />
        <div className="layout-container">
          <div className="content-wrapper">
            <div className="layout-content-container">
              <h1 className="page-title">Loading Applications...</h1>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container applications-table-page">
        <Header />
        <div className="layout-container">
          <div className="content-wrapper">
            <div className="layout-content-container">
              <h1 className="page-title" style={{ color: '#ff6b6b' }}>
                Error: {error}
              </h1>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-container applications-table-page">
      <Header />

      <div className="layout-container">
        <div className="content-wrapper">
          <div className="layout-content-container">
            <header className="page-header-section">
              <div className="header-text-group">
                <h1 className="page-title">♟️ Submitted Applications</h1>
                <p className="page-description">
                  A total of <strong>{applications.length}</strong> application(s) found.
                </p>
              </div>
            </header>

            <div className="table-container">
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>Submission Date</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Major</th>
                    <th>Batch</th>
                    <th>ID Number</th>
                    <th className="sticky-details-header">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app._id}>
                      <td>{new Date(app.submissionDate).toLocaleString()}</td>
                      <td>{app.name}</td>
                      <td>{app.email}</td>
                      <td>{app.phone}</td>
                      <td>{app.roleTitle}</td>
                      <td>{app.department}</td>
                      <td>{app.major}</td>
                      <td>{app.batch}</td>
                      <td>{app.idNumber}</td>
                      <td className="sticky-details-cell">
                        <button className="view-button" onClick={() => openModal(app.roleSpecificData)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {modalOpen && (
              <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2>Role Specific Data</h2>
                    <button className="modal-close" onClick={closeModal}>
                      ✕
                    </button>
                  </div>
                  <div className="modal-body">
                    <PrettyRoleData data={selectedData} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ApplicationsTable;