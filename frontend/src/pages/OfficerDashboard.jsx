import React, {useState, useEffect} from 'react';
import axios from 'axios';
import { ClipboardList, History, User, LogOut, Eye, Edit, Download, MapPin, FileText, Calendar, Shield } from 'lucide-react';
const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

export default function OfficerDashboard(){
  const [cases, setCases] = useState([]);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('Investigation');
  const [file, setFile] = useState(null);
  const [gps, setGps] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('assigned-cases');
  const [completedCases, setCompletedCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [viewMode, setViewMode] = useState(null); // 'view' or 'update'
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('recent');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    gender: '',
    dob: '',
    postingSite: '',
    badgeNumber: ''
  });
  const [viewFileUrl, setViewFileUrl] = useState(null);
  const [viewFileName, setViewFileName] = useState('');
  const token = localStorage.getItem('token');

  const fetchCases = async () => {
    try{
      const params = new URLSearchParams();
      if(typeFilter !== 'all') params.append('type', typeFilter);
      params.append('sort', sortOrder);
      const res = await axios.get(`${API}/complaints?${params.toString()}`, { headers:{ Authorization: 'Bearer '+token }});
      setCases(res.data);
    }catch(err){ console.error(err); }
  };

  const fetchCompletedCases = async () => {
    try{
      const params = new URLSearchParams();
      params.append('status', 'Closed');
      const res = await axios.get(`${API}/complaints?${params.toString()}`, { headers:{ Authorization: 'Bearer '+token }});
      setCompletedCases(res.data);
    }catch(err){ console.error(err); }
  };



  useEffect(()=>{ fetchCases(); }, [typeFilter, sortOrder]);

  useEffect(() => {
    if (activeSection === 'completed-cases') {
      fetchCompletedCases();
    }
  }, [activeSection]);

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await axios.get(`${API}/users/me`, { headers: { Authorization: 'Bearer ' + token } });
      setProfile(res.data);
      setProfileForm({
        fullName: res.data.fullName || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
        gender: res.data.gender || '',
        dob: res.data.dob ? new Date(res.data.dob).toISOString().split('T')[0] : '',
        postingSite: res.data.postingSite || '',
        badgeNumber: res.data.badgeNumber || ''
      });
    } catch (err) {
      console.error(err);
      alert('Error fetching profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const res = await axios.put(`${API}/users/me`, profileForm, { headers: { Authorization: 'Bearer ' + token } });
      setProfile(res.data);
      setEditMode(false);
      alert('Profile updated successfully');
    } catch (err) {
      console.error(err);
      alert('Error updating profile');
    }
  };

  useEffect(() => {
    if (activeSection === 'profile') {
      fetchProfile();
    }
  }, [activeSection]);

  const getGPS = () => {
    setGpsLoading(true);
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = `Latitude ${pos.coords.latitude}, Longitude ${pos.coords.longitude}`;
          setGps(loc);
          setGpsLoading(false);
        },
        (err) => {
          alert('GPS error: ' + err.message);
          setGpsLoading(false);
        }
      );
    }else{
      alert('GPS not supported');
      setGpsLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    try{
      const form = new FormData();
      form.append('note', note);
      form.append('status', status);
      if(file) form.append('evidence', file);
      await axios.post(`${API}/complaints/${id}/update`, form, { headers:{ Authorization: 'Bearer '+token, 'Content-Type': 'multipart/form-data' }});
      alert('Updated');
      setNote(''); setStatus('Investigation'); setFile(null); setGps('');
      setSelectedCase(null);
      setViewMode(null);
      fetchCases();
    } catch (err) {
      console.error(err);
      alert('Error updating case');
    }
  };

  const handleViewCase = (caseData) => {
    setSelectedCase(caseData);
    setViewMode('view');
  };

  const handleUpdateCase = (caseData) => {
    setSelectedCase(caseData);
    setViewMode('update');
    setNote('');
    setStatus(caseData.status);
    setFile(null);
    setGps('');
  };

  const handleDownloadEvidence = async (fileId, filename) => {
    try {
      const response = await axios.get(`${API}/complaints/files/${fileId}`, {
        headers: { Authorization: 'Bearer ' + token },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  const handleDownloadFIR = async (caseId) => {
    try {
      const response = await axios.get(`${API}/complaints/${caseId}/fir-pdf`, {
        headers: { Authorization: 'Bearer ' + token },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FIR_${caseId.slice(-8).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading FIR PDF:', error);
      alert('Error downloading FIR PDF');
    }
  };

  const handleViewEvidence = async (fileId, filename) => {
    try {
      const response = await axios.get(`${API}/complaints/files/${fileId}`, {
        headers: { Authorization: 'Bearer ' + token },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Open file in modal viewer within the same window
      setViewFileUrl(url);
      setViewFileName(filename);

    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Error viewing file: ' + error.message);
    }
  };

  const handleCloseCase = async (id) => {
    if (window.confirm('Are you sure you want to close this case?')) {
      try {
        const form = new FormData();
        form.append('note', note || 'Case closed');
        form.append('status', 'Closed');
        if(file) form.append('evidence', file);
        await axios.post(`${API}/complaints/${id}/update`, form, { headers:{ Authorization: 'Bearer '+token, 'Content-Type': 'multipart/form-data' }});
        alert('Case closed successfully');
        setNote(''); setStatus('Investigation'); setFile(null); setGps('');
        setSelectedCase(null);
        setViewMode(null);
        fetchCases();
      } catch (err) {
        console.error(err);
        alert('Error closing case');
      }
    }
  };

  const closeFileViewer = () => {
    if (viewFileUrl) {
      window.URL.revokeObjectURL(viewFileUrl);
      setViewFileUrl(null);
      setViewFileName('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      {viewFileUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeFileViewer}>
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-5xl max-h-5xl w-full h-full relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-blue-600" />
              {viewFileName}
              </h3>
              <button onClick={closeFileViewer} className="text-gray-500 hover:text-gray-700 text-2xl hover:bg-gray-100 rounded-full p-2 transition-colors">
                &times;
              </button>
            </div>
            <div className="w-full h-full overflow-auto bg-gray-50 rounded-lg">
              {viewFileName.toLowerCase().endsWith('.pdf') ? (
                <object data={viewFileUrl} type="application/pdf" className="w-full h-full rounded-lg" title={viewFileName}>
                  <embed src={viewFileUrl} type="application/pdf" className="w-full h-full rounded-lg" />
                  <p>Unable to display PDF. <a href={viewFileUrl} download={viewFileName}>Download instead</a></p>
                </object>
              ) : viewFileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/) ? (
                <img src={viewFileUrl} alt={viewFileName} className="max-w-full max-h-full object-contain mx-auto" />
              ) : viewFileName.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv|webm)$/) ? (
                <video controls className="max-w-full max-h-full mx-auto rounded-lg">
                  <source src={viewFileUrl} type={`video/${viewFileName.split('.').pop()}`} />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <iframe src={viewFileUrl} className="w-full h-full rounded-lg" title={viewFileName}></iframe>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="w-72 bg-white shadow-xl p-6 border-r border-gray-200">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-blue-600 text-2xl" />
          <h2 className="text-xl font-bold text-gray-800">Officer Dashboard</h2>
        </div>
        <ul className="space-y-3">
          <li>
            <button onClick={() => setActiveSection('assigned-cases')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeSection === 'assigned-cases' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}>
              <ClipboardList />
              Assigned Cases
            </button>
          </li>
          <li>
            <button onClick={() => setActiveSection('case-updates')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeSection === 'case-updates' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}>
              <History />
              Case Updates
            </button>
          </li>
          <li>
            <button onClick={() => setActiveSection('completed-cases')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeSection === 'completed-cases' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}>
              <FileText />
              Completed Cases
            </button>
          </li>
          <li>
            <button onClick={() => setActiveSection('profile')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeSection === 'profile' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}>
              <User />
              Profile
            </button>
          </li>
          <li className="pt-4 border-t">
            <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }} className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all">
              <LogOut />
              Logout
            </button>
          </li>
        </ul>
      </div>
      <div className="flex-1 p-8">
        {activeSection === 'assigned-cases' && !selectedCase && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Assigned Cases</h1>
                <p className="text-gray-600">Manage and track your assigned complaint cases</p>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="Assault">Assault</option>
                    <option value="Fraud">Fraud</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Theft">Theft</option>
                    <option value="Burglary">Burglary</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="recent">Recent First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>
            {cases.length === 0 ? (
              <div className="bg-white shadow-lg rounded-xl p-12 text-center">
                <ClipboardList className="text-gray-400 text-6xl mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Cases Assigned</h3>
                <p className="text-gray-500">You don't have any cases assigned at the moment.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {cases.map(c=>(
                  <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow" key={c._id}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-800">{c.type}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${c.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : c.status === 'Under Review' ? 'bg-blue-100 text-blue-800 border border-blue-200' : c.status === 'Investigation' ? 'bg-orange-100 text-orange-800 border border-orange-200' : c.status === 'Closed' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>{c.status}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <MapPin className="text-gray-400" />
                          <span>{c.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <Calendar className="text-gray-400" />
                          <span>{new Date(c.date).toLocaleDateString()} at {c.time}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-4 line-clamp-2">{c.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="text-gray-400" />
                        <span>{c.evidence?.length || 0} evidence files</span>
                      </div>
                      <div className="flex gap-3">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2" onClick={()=>handleViewCase(c)}>
                          <Eye />
                          View Details
                        </button>
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2" onClick={()=>handleUpdateCase(c)}>
                          <Edit />
                          Update Case
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {selectedCase && viewMode === 'view' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Case Details</h1>
                <p className="text-gray-600">Detailed view of the selected complaint case</p>
              </div>
              <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2" onClick={()=>{setSelectedCase(null); setViewMode(null);}}>
                <ClipboardList />
                Back to Cases
              </button>
            </div>
            <div className="bg-white shadow-xl rounded-xl p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FileText className="text-blue-600" />
                    Case Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-600">Type:</span>
                      <span className="text-gray-800">{selectedCase.type}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-600">Location:</span>
                      <span className="text-gray-800">{selectedCase.location}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-600">Date & Time:</span>
                      <span className="text-gray-800">{new Date(selectedCase.date).toLocaleDateString()} {selectedCase.time}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${selectedCase.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : selectedCase.status === 'Under Review' ? 'bg-blue-100 text-blue-800 border border-blue-200' : selectedCase.status === 'Investigation' ? 'bg-orange-100 text-orange-800 border border-orange-200' : selectedCase.status === 'Closed' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>{selectedCase.status}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-gray-600">Anonymous:</span>
                      <span className="text-gray-800">{selectedCase.anonymous ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FileText className="text-blue-600" />
                    Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{selectedCase.description}</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <FileText className="text-blue-600" />
                  Evidence Files
                </h3>
                {selectedCase.evidence && selectedCase.evidence.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedCase.evidence.map((evidence, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{evidence.filename}</p>
                            <p className="text-sm text-gray-500">{(evidence.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1 text-sm"
                            onClick={() => handleViewEvidence(evidence.fileId, evidence.filename)}
                          >
                            <Eye />
                            View
                          </button>
                          <button
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 text-sm"
                            onClick={() => handleDownloadEvidence(evidence.fileId, evidence.filename)}
                          >
                            <Download />
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="text-gray-400 text-4xl mx-auto mb-2" />
                    <p className="text-gray-500">No evidence files uploaded</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <History className="text-blue-600" />
                  Case History
                </h3>
                {selectedCase.updates && selectedCase.updates.length > 0 ? (
                  <div className="space-y-6">
                    {selectedCase.updates.map((update, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-6 bg-gray-50 rounded-r-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="text-gray-700 mb-2">{update.note}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Status: <span className={`px-2 py-1 rounded-full text-xs font-semibold ${update.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800' : update.status === 'Under Review' ? 'bg-blue-100 text-blue-800' : update.status === 'Investigation' ? 'bg-orange-100 text-orange-800' : update.status === 'Closed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{update.status}</span></span>
                              <span>{new Date(update.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        {update.evidence && update.evidence.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-600 mb-2">Attached Evidence:</p>
                            <div className="flex flex-wrap gap-2">
                              {update.evidence.map((evidence, idx) => (
                                <div key={idx} className="flex gap-2 items-center bg-white rounded-lg p-2 border">
                                  <button
                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                                    onClick={() => handleViewEvidence(evidence.fileId, evidence.filename)}
                                  >
                                    <Eye />
                                    View
                                  </button>
                                  <button
                                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors flex items-center gap-1"
                                    onClick={() => handleDownloadEvidence(evidence.fileId, evidence.filename)}
                                  >
                                    <Download />
                                    {evidence.filename}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="text-gray-400 text-4xl mx-auto mb-2" />
                    <p className="text-gray-500">No updates yet</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {selectedCase && viewMode === 'update' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Update Case</h1>
                <p className="text-gray-600">Add updates and manage the case status</p>
              </div>
              <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2" onClick={()=>{setSelectedCase(null); setViewMode(null);}}>
                <ClipboardList />
                Back to Cases
              </button>
            </div>
            <div className="bg-white shadow-xl rounded-xl p-8">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="text-blue-600" />
                  Case Summary
                </h3>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-semibold text-gray-800">{selectedCase.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-semibold text-gray-800">{selectedCase.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Date</p>
                        <p className="font-semibold text-gray-800">{new Date(selectedCase.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-gray-800">{selectedCase.description}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Edit className="text-blue-600" />
                      Update Note
                    </label>
                    <textarea
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Enter your update note here..."
                      value={note}
                      onChange={e=>setNote(e.target.value)}
                      rows="4"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FileText className="text-blue-600" />
                      Status Update
                    </label>
                    <select
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={status}
                      onChange={e=>setStatus(e.target.value)}
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Investigation">Investigation</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FileText className="text-blue-600" />
                      Additional Evidence
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={e=>setFile(e.target.files[0])}
                        className="hidden"
                        id="evidence-upload"
                      />
                      <label htmlFor="evidence-upload" className="cursor-pointer">
                        <FileText className="text-gray-400 text-3xl mx-auto mb-2" />
                        <p className="text-gray-600">Click to upload additional evidence</p>
                        <p className="text-sm text-gray-500">Supported: Images, Videos, PDF, DOC, DOCX</p>
                      </label>
                      {file && <p className="text-sm text-green-600 mt-2">Selected: {file.name}</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <MapPin className="text-blue-600" />
                      GPS Location
                    </label>
                    <div className="flex gap-3">
                      <input
                        className="flex-1 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter GPS location or use GPS button"
                        value={gps}
                        onChange={e=>setGps(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={getGPS}
                        className="px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        disabled={gpsLoading}
                      >
                        <MapPin />
                        {gpsLoading ? 'Getting...' : 'GPS'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Action Buttons</h4>
                    <div className="space-y-3">
                      <button
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                        onClick={()=>handleUpdate(selectedCase._id)}
                      >
                        <Edit />
                        Submit Report
                      </button>
                      <button
                        className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                        onClick={()=>handleCloseCase(selectedCase._id)}
                      >
                        <FileText />
                        Submit Report & Close Case
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === 'completed-cases' && !selectedCase && (
          <div className="bg-white shadow-xl rounded-xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <FileText className="text-blue-600 text-3xl" />
              <div>
                <h1 className="text-4xl font-bold text-gray-800">Completed Cases</h1>
                <p className="text-gray-600">View and download FIR reports for closed cases</p>
              </div>
            </div>
            {completedCases.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="text-gray-400 text-6xl mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Completed Cases</h3>
                <p className="text-gray-500">You don't have any completed cases yet.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {completedCases.map(c=>(
                  <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow border border-gray-100" key={c._id}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-800">{c.type}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200`}>Closed</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <MapPin className="text-gray-400" />
                          <span>{c.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <Calendar className="text-gray-400" />
                          <span>{new Date(c.date).toLocaleDateString()} at {c.time}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-4 line-clamp-2">{c.description}</p>
                    {c.evidence && c.evidence.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Evidence Files:</h4>
                        <div className="flex flex-wrap gap-2">
                          {c.evidence.map((ev, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                              <FileText className="text-gray-500 text-sm" />
                              <span className="text-sm text-gray-700 truncate max-w-32">{ev.filename}</span>
                              <button
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                onClick={() => handleViewEvidence(ev.fileId, ev.filename)}
                              >
                                View
                              </button>
                              <button
                                className="text-green-600 hover:text-green-800 text-sm font-medium"
                                onClick={() => handleDownloadEvidence(ev.fileId, ev.filename)}
                              >
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="text-gray-400" />
                        <span>{c.evidence?.length || 0} evidence files</span>
                      </div>
                      <div className="flex gap-3">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2" onClick={()=>handleViewCase(c)}>
                          <Eye />
                          View Details
                        </button>
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2" onClick={()=>handleDownloadFIR(c._id)}>
                          <Download />
                          Download FIR
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeSection === 'case-updates' && !selectedCase && (
          <div className="bg-white shadow-xl rounded-xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <History className="text-blue-600 text-3xl" />
              <div>
                <h1 className="text-4xl font-bold text-gray-800">Case Updates</h1>
                <p className="text-gray-600">Recent updates from all your assigned cases</p>
              </div>
            </div>
            <div className="space-y-6">
              {cases.filter(c => c.updates && c.updates.length > 0).map(c => (
                <div key={c._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="text-blue-600" />
                      <div>
                        <h3 className="font-bold text-gray-800">{c.type} - {c.location}</h3>
                        <p className="text-sm text-gray-600">Case ID: {c._id.slice(-8)}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${c.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : c.status === 'Under Review' ? 'bg-blue-100 text-blue-800 border border-blue-200' : c.status === 'Investigation' ? 'bg-orange-100 text-orange-800 border border-orange-200' : c.status === 'Closed' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>{c.status}</span>
                  </div>
                  <div className="space-y-3 mb-4">
                    {c.updates.slice(-3).map((update, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-gray-800 text-sm leading-relaxed">{update.note}</p>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="text-gray-400" />
                            {new Date(update.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${update.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800' : update.status === 'Under Review' ? 'bg-blue-100 text-blue-800' : update.status === 'Investigation' ? 'bg-orange-100 text-orange-800' : update.status === 'Closed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{update.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
                    onClick={()=>handleViewCase(c)}
                  >
                    <Eye />
                    View Full Case
                  </button>
                </div>
              ))}
              {cases.filter(c => c.updates && c.updates.length > 0).length === 0 && (
                <div className="text-center py-12">
                  <History className="text-gray-400 text-6xl mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Case Updates</h3>
                  <p className="text-gray-500">There are no recent updates from your assigned cases.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeSection === 'profile' && (
          <div className="bg-white shadow-xl rounded-xl p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <User className="text-blue-600 text-3xl" />
                <div>
                  <h1 className="text-4xl font-bold text-gray-800">Officer Profile</h1>
                  <p className="text-gray-600">Manage your personal and professional information</p>
                </div>
              </div>
              {!editMode && profile && (
                <button
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
                  onClick={() => setEditMode(true)}
                >
                  <Edit />
                  Edit Profile
                </button>
              )}
            </div>
            {profileLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading profile...</p>
              </div>
            ) : profile ? (
              editMode ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <User className="text-blue-600" />
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <User className="text-blue-600" />
                          Phone
                        </label>
                        <input
                          type="text"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your phone number"
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <MapPin className="text-blue-600" />
                          Address
                        </label>
                        <input
                          type="text"
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your address"
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <User className="text-blue-600" />
                          Gender
                        </label>
                        <select
                          value={profileForm.gender}
                          onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Calendar className="text-blue-600" />
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={profileForm.dob}
                          onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <MapPin className="text-blue-600" />
                          Posting Site
                        </label>
                        <input
                          type="text"
                          value={profileForm.postingSite}
                          onChange={(e) => setProfileForm({ ...profileForm, postingSite: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your posting site"
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Shield className="text-blue-600" />
                          Badge Number
                        </label>
                        <input
                          type="text"
                          value={profileForm.badgeNumber}
                          onChange={(e) => setProfileForm({ ...profileForm, badgeNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your badge number"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-6 border-t">
                    <button
                      className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
                      onClick={handleProfileUpdate}
                    >
                      <Edit />
                      Save Changes
                    </button>
                    <button
                      className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-semibold"
                      onClick={() => {
                        setEditMode(false);
                        setProfileForm({
                          fullName: profile.fullName || '',
                          phone: profile.phone || '',
                          address: profile.address || '',
                          gender: profile.gender || '',
                          dob: profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
                          postingSite: profile.postingSite || '',
                          badgeNumber: profile.badgeNumber || ''
                        });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Personal Information */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-200">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <User className="text-blue-600" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Full Name</p>
                        <p className="font-semibold text-gray-800">{profile.fullName || 'N/A'}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Email</p>
                        <p className="font-semibold text-gray-800">{profile.email}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Phone</p>
                        <p className="font-semibold text-gray-800">{profile.phone || 'N/A'}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Gender</p>
                        <p className="font-semibold text-gray-800">{profile.gender || 'N/A'}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Date of Birth</p>
                        <p className="font-semibold text-gray-800">{profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Joined</p>
                        <p className="font-semibold text-gray-800">{new Date(profile.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Aadhar</p>
                        <p className="font-semibold text-gray-800">{profile.aadhar}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Verified</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${profile.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {profile.verified ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 rounded-xl border border-green-200">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <Shield className="text-green-600" />
                      Professional Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Role</p>
                        <p className="font-semibold text-gray-800">{profile.role}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Posting Site</p>
                        <p className="font-semibold text-gray-800">{profile.postingSite || 'N/A'}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">Badge Number</p>
                        <p className="font-semibold text-gray-800">{profile.badgeNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 rounded-xl border border-purple-200">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <MapPin className="text-purple-600" />
                      Contact Information
                    </h3>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-600 mb-1">Address</p>
                      <p className="font-semibold text-gray-800">{profile.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <User className="text-gray-400 text-6xl mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Failed to Load Profile</h3>
                <p className="text-gray-500">Please try refreshing the page.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
