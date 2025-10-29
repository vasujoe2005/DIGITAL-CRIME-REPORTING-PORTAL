import React, {useState, useEffect, useMemo} from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { BarChart3, Users, ClipboardList, PieChart as PieChartIcon, LogOut, Eye, Edit, FileText, Calendar, Shield, Bell, MapPin, Download } from 'lucide-react';

const CalendarView = ({ dailyStats, selectedMonth, selectedYear }) => {
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
  const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay()); // Start from Sunday

  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay())); // End on Saturday

  const days = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const count = dailyStats[dateStr] || 0;
    const isCurrentMonth = currentDate.getMonth() === selectedMonth;
    days.push({ date: new Date(currentDate), count, isCurrentMonth });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return (
    <div className="calendar">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-1 text-center font-semibold text-gray-700 text-xs">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div
            key={index}
            className={`p-1 border rounded text-center text-xs ${day.isCurrentMonth ? 'font-semibold bg-gray-100' : 'text-gray-400 bg-gray-50'}`}
          >
            <div>{day.date.getDate()}</div>
            <div className="text-xs">{day.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

export default function AdminDashboard(){
  const [officers, setOfficers] = useState([]);
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', aadhar:'', address:'', gender:'', dob:'', postingSite:'', badgeNumber:'' });

  const [alerts, setAlerts] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try{
      const [officersRes, usersRes, complaintsRes] = await Promise.all([
        axios.get(`${API}/admin/officers`, { headers:{ Authorization: 'Bearer '+token }}),
        axios.get(`${API}/users/me`, { headers:{ Authorization: 'Bearer '+token }}), // Assuming admin can fetch all users, but using me for now
        axios.get(`${API}/complaints`, { headers:{ Authorization: 'Bearer '+token }})
      ]);
      setOfficers(officersRes.data);
      // For simplicity, set users to empty or fetch separately if needed
      setComplaints(complaintsRes.data);
      // Recent alerts: last 10 complaints
      setAlerts(complaintsRes.data.slice(-10));
    }catch(err){ console.error(err); }
  };

  const stats = useMemo(() => {
    if (!complaints.length) return { typeStats: {}, dailyStats: {} };
    const typeStats = {};
    const dailyStats = {};
    complaints.forEach(c => {
      typeStats[c.type] = (typeStats[c.type] || 0) + 1;
      const date = new Date(c.createdAt).toISOString().split('T')[0];
      dailyStats[date] = (dailyStats[date] || 0) + 1;
    });

    // Fill in last 30 days with 0 if no complaints
    const today = new Date();
    const last30Days = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last30Days[dateStr] = dailyStats[dateStr] || 0;
    }

    return { typeStats, dailyStats: last30Days };
  }, [complaints]);

  useEffect(()=>{ fetchData(); }, []);

  const handleAddOfficer = async (e) => {
    e.preventDefault();
    try{
      const officerData = { ...form, verified: true };
      await axios.post(`${API}/admin/add-officer`, officerData, { headers:{ Authorization: 'Bearer '+token }});
      alert('Officer added successfully');
      setForm({ fullName:'', email:'', phone:'', aadhar:'', address:'', gender:'', dob:'', postingSite:'', badgeNumber:'' });
      fetchData();
    }catch(err){ alert(err?.response?.data?.msg || 'Error'); }
  };

  const handleAddAdminNote = async (complaintId) => {
    if(!adminNote.trim()) return alert('Note cannot be empty');
    try{
      await axios.post(`${API}/admin/add-note/${complaintId}`, { note: adminNote }, { headers:{ Authorization: 'Bearer '+token }});
      alert('Note added successfully');
      setAdminNote('');
      setSelectedComplaint(null);
      fetchData();
    }catch(err){ alert(err?.response?.data?.msg || 'Error'); }
  };

  const handleDownloadStatistics = async () => {
    try {
      const response = await axios.get(`${API}/admin/download-statistics`, {
        headers: { Authorization: 'Bearer ' + token },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'admin-statistics-report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Error downloading statistics PDF');
    }
  };

  const handleDownloadCaseReport = async (complaintId) => {
    try {
      const response = await axios.get(`${API}/admin/download-case-report/${complaintId}`, {
        headers: { Authorization: 'Bearer ' + token },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `case-report-${complaintId.slice(-8).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Error downloading case report PDF');
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      <div className="w-72 bg-white shadow-xl p-6 border-r border-gray-200">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-blue-600 text-2xl" />
          <h2 className="text-xl font-bold text-gray-800">Admin Dashboard</h2>
        </div>
        <ul className="space-y-3">
          <li>
            <button onClick={() => setActiveSection('overview')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeSection === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}>
              <BarChart3 />
              Overview
            </button>
          </li>
          <li>
            <button onClick={() => setActiveSection('manage-officers')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeSection === 'manage-officers' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}>
              <Users />
              Manage Officers
            </button>
          </li>
          <li>
            <button onClick={() => setActiveSection('manage-complaints')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeSection === 'manage-complaints' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}>
              <ClipboardList />
              Manage Complaints
            </button>
          </li>
          <li>
            <button onClick={() => setActiveSection('statistics')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeSection === 'statistics' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}>
              <PieChartIcon />
              Statistics
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
        {activeSection === 'overview' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Admin Dashboard Overview</h1>
                <p className="text-gray-600">Monitor system performance and key metrics at a glance</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Complaints</p>
                    <p className="text-3xl font-bold">{complaints.length}</p>
                  </div>
                  <ClipboardList className="text-blue-200 text-3xl" />
                </div>
                <div className="mt-4">
                  <span className="text-blue-100 text-sm">+12% from last month</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Active Cases</p>
                    <p className="text-3xl font-bold">{complaints.filter(c => c.status !== 'Closed').length}</p>
                  </div>
                  <FileText className="text-green-200 text-3xl" />
                </div>
                <div className="mt-4">
                  <span className="text-green-100 text-sm">Under investigation</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Total Officers</p>
                    <p className="text-3xl font-bold">{officers.length}</p>
                  </div>
                  <Shield className="text-purple-200 text-3xl" />
                </div>
                <div className="mt-4">
                  <span className="text-purple-100 text-sm">Active personnel</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Resolution Rate</p>
                    <p className="text-3xl font-bold">{complaints.length > 0 ? Math.round((complaints.filter(c => c.status === 'Closed').length / complaints.length) * 100) : 0}%</p>
                  </div>
                  <BarChart3 className="text-orange-200 text-3xl" />
                </div>
                <div className="mt-4">
                  <span className="text-orange-100 text-sm">Cases resolved</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white shadow-xl rounded-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <PieChartIcon className="text-blue-600" />
                  Complaint Types Distribution
                </h3>
                {stats && stats.typeStats && Object.keys(stats.typeStats).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(stats.typeStats).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-700 font-medium">{type}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{width: `${(count / Math.max(...Object.values(stats.typeStats))) * 100}%`}}></div>
                          </div>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold text-sm">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PieChartIcon className="text-gray-400 text-4xl mx-auto mb-2" />
                    <p className="text-gray-500">No complaint data available</p>
                  </div>
                )}
              </div>
              <div className="bg-white shadow-xl rounded-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Bell className="text-red-600" />
                  Recent Activity Feed
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {alerts.length > 0 ? alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10).map(a=>(
                    <div key={a._id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 hover:shadow-md transition-shadow">
                      <div className="bg-red-100 p-2 rounded-full">
                        <FileText className="text-red-600 text-sm" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{a.type} Complaint</div>
                        <div className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                          <MapPin className="text-gray-400 text-xs" />
                          {a.location}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <Calendar className="text-gray-400 text-xs" />
                          {new Date(a.createdAt).toLocaleDateString()} at {new Date(a.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${a.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800' : a.status === 'Under Review' ? 'bg-blue-100 text-blue-800' : a.status === 'Investigation' ? 'bg-orange-100 text-orange-800' : a.status === 'Closed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{a.status}</span>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <Bell className="text-gray-400 text-4xl mx-auto mb-2" />
                      <p className="text-gray-500">No recent activities</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white shadow-xl rounded-xl p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BarChart3 className="text-green-600" />
                System Health Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Shield className="text-green-600 text-2xl" />
                  </div>
                  <h4 className="font-semibold text-gray-800">System Status</h4>
                  <p className="text-green-600 font-medium">All Systems Operational</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Users className="text-blue-600 text-2xl" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Active Officers</h4>
                  <p className="text-blue-600 font-medium">{officers.filter(o => o.verified).length} Verified</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <ClipboardList className="text-purple-600 text-2xl" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Pending Cases</h4>
                  <p className="text-purple-600 font-medium">{complaints.filter(c => c.status === 'Submitted' || c.status === 'Under Review').length} Awaiting Action</p>
                </div>
              </div>
            </div>
          </>
        )}
        {activeSection === 'manage-officers' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Manage Officers</h1>
                <p className="text-gray-600">Add new officers and view existing ones</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white shadow-xl rounded-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Users className="text-blue-600" />
                  Add Officer
                </h3>
                <form onSubmit={handleAddOfficer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input className="p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Full name" value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})} required />
                  <input className="p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
                  <input className="p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} required />
                  <input className="p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Aadhar" value={form.aadhar} onChange={e=>setForm({...form, aadhar:e.target.value})} required />
                  <input className="p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Address" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} required />
                  <select className="p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={form.gender} onChange={e=>setForm({...form, gender:e.target.value})} required>
                    <option value=''>Gender</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                  <input className="p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" type="date" value={form.dob} onChange={e=>setForm({...form, dob:e.target.value})} required />
                  <input className="p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Posting Site" value={form.postingSite} onChange={e=>setForm({...form, postingSite:e.target.value})} required />
                  <input className="p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Badge Number" value={form.badgeNumber} onChange={e=>setForm({...form, badgeNumber:e.target.value})} required />
                  <div className="md:col-span-2">
                    <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold" type="submit">Add Officer</button>
                  </div>
                </form>
              </div>
              <div className="bg-white shadow-xl rounded-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Shield className="text-green-600" />
                  Existing Officers
                </h3>
                <ul className="space-y-4">
                  {officers.map(o=>(
                    <li key={o._id} className="p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md transition-shadow">
                      <div className="font-semibold text-gray-800">{o.fullName}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Users className="text-gray-400" />
                        {o.email} — {o.postingSite} — Badge: {o.badgeNumber}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
        {activeSection === 'statistics' && (
          <div className="bg-white shadow-xl rounded-xl p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Statistics</h1>
                <p className="text-gray-600">Visualize complaint data and trends</p>
              </div>
              <button
                onClick={handleDownloadStatistics}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
              >
                <Download />
                Download Statistics PDF
              </button>
            </div>
            {stats && stats.typeStats && Object.keys(stats.typeStats).length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <PieChartIcon className="text-blue-600" />
                      Complaint Types (Pie Chart)
                    </h3>
                    <PieChart width={400} height={300}>
                      <Pie
                        data={Object.entries(stats.typeStats).map(([type, count]) => ({ name: type, value: count }))}
                        cx={200}
                        cy={150}
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(stats.typeStats).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <BarChart3 className="text-green-600" />
                      Complaint Types (Bar Chart)
                    </h3>
                    <BarChart width={400} height={300} data={Object.entries(stats.typeStats).map(([type, count]) => ({ type, count }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <BarChart3 className="text-purple-600" />
                    Daily Complaints (Line Chart)
                  </h3>
                  <LineChart width={800} height={300} data={Object.entries(stats.dailyStats || {}).map(([date, count]) => ({ date, count })).sort((a, b) => new Date(a.date) - new Date(b.date))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" />
                  </LineChart>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Calendar className="text-yellow-600" />
                    Daily Complaints Calendar
                  </h3>
                  <div className="mb-6 flex gap-4">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => {
                        const year = 2020 + i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>
                  <CalendarView dailyStats={stats.dailyStats} selectedMonth={selectedMonth} selectedYear={selectedYear} />
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="text-gray-400 text-6xl mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading Statistics</h3>
                <p className="text-gray-500">Please wait while we load the data...</p>
              </div>
            )}
          </div>
        )}
        {activeSection === 'manage-complaints' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Manage Complaints</h1>
                <p className="text-gray-600">Review and manage all complaint cases</p>
              </div>
            </div>
            {selectedComplaint ? (
              <div className="bg-white shadow-xl rounded-xl p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800">Complaint Details</h2>
                  <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2" onClick={()=>{setSelectedComplaint(null); setAdminNote('');}}>
                    <ClipboardList />
                    Back to List
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <FileText className="text-blue-600" />
                      Case Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="font-medium text-gray-600">Type:</span>
                        <span className="text-gray-800">{selectedComplaint.type}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="font-medium text-gray-600">Location:</span>
                        <span className="text-gray-800">{selectedComplaint.location}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="font-medium text-gray-600">Date & Time:</span>
                        <span className="text-gray-800">{new Date(selectedComplaint.date).toLocaleDateString()} {selectedComplaint.time}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="font-medium text-gray-600">Status:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${selectedComplaint.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : selectedComplaint.status === 'Under Review' ? 'bg-blue-100 text-blue-800 border border-blue-200' : selectedComplaint.status === 'Investigation' ? 'bg-orange-100 text-orange-800 border border-orange-200' : selectedComplaint.status === 'Closed' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>{selectedComplaint.status}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="font-medium text-gray-600">Anonymous:</span>
                        <span className="text-gray-800">{selectedComplaint.anonymous ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium text-gray-600">Assigned Officer:</span>
                        <span className="text-gray-800">{selectedComplaint.assignedOfficer ? selectedComplaint.assignedOfficer.fullName : 'None'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <FileText className="text-blue-600" />
                      Description
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{selectedComplaint.description}</p>
                  </div>
                </div>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Edit className="text-blue-600" />
                    Case History
                  </h3>
                  {selectedComplaint.updates && selectedComplaint.updates.length > 0 ? (
                    <div className="space-y-6">
                      {selectedComplaint.updates.map((update, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-6 bg-gray-50 rounded-r-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p className="text-gray-700 mb-2">{update.note}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>By: {update.type === 'admin' ? 'Admin' : 'Officer'}</span>
                                <span>{new Date(update.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Edit className="text-gray-400 text-4xl mx-auto mb-2" />
                      <p className="text-gray-500">No updates yet</p>
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Edit className="text-blue-600" />
                    Add Admin Note
                  </h3>
                  <textarea className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Enter your note for the officer..." value={adminNote} onChange={e=>setAdminNote(e.target.value)} rows="4"></textarea>
                  <button className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2" onClick={()=>handleAddAdminNote(selectedComplaint._id)}>
                    <Edit />
                    Add Note
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {complaints.length === 0 ? (
                  <div className="bg-white shadow-xl rounded-xl p-12 text-center">
                    <ClipboardList className="text-gray-400 text-6xl mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Complaints</h3>
                    <p className="text-gray-500">There are no complaints to manage at the moment.</p>
                  </div>
                ) : (
                  complaints.map(c=>(
                    <div className="bg-white shadow-xl rounded-xl p-6 hover:shadow-2xl transition-shadow" key={c._id}>
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
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Users className="text-gray-400" />
                            <span>Officer: {c.assignedOfficer ? c.assignedOfficer.fullName : 'None'}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-4 line-clamp-2">{c.description}</p>
                      <div className="flex gap-3">
                        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold" onClick={()=>setSelectedComplaint(c)}>
                          <Eye />
                          View Details
                        </button>
                        <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold" onClick={()=>handleDownloadCaseReport(c._id)}>
                          <Download />
                          Download Case Report
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}


      </div>
    </div>
  );
}
