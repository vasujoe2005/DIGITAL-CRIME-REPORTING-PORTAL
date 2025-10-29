import React, {useState, useEffect} from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { Shield, EyeOff, Phone, User, Newspaper } from 'lucide-react';
const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

export default function UserDashboard(){
  const [cases, setCases] = useState([]);
  const [form, setForm] = useState({
    type:'', date:'', time:'', location:'', nearestLandmark:'', description:'', anonymous:false,
    relationToVictim: '',
    accusedDetails: [{ name: '', alias: '', age: '', address: '', status: '', remarks: '' }],
    victimDetails: [{ name: '', gender: '', age: '', address: '', injuryLoss: '' }]
  });
  const [files, setFiles] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [editDateError, setEditDateError] = useState('');
  const [editTimeError, setEditTimeError] = useState('');
  const [activeSection, setActiveSection] = useState(localStorage.getItem('activeSection') || 'latest-news');
  const [news, setNews] = useState([]);
  const [userProfile, setUserProfile] = useState({});
  const [profileForm, setProfileForm] = useState({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null });
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('recent');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const fetchCases = async () => {
    try{
      const params = new URLSearchParams();
      if(typeFilter !== 'all') params.append('type', typeFilter);
      params.append('sort', sortOrder);
      const res = await axios.get(`${API}/complaints?${params.toString()}`, { headers:{ Authorization: 'Bearer '+token }});
      setCases(res.data);
    }catch(err){ console.error(err); }
  };

  const fetchNews = async () => {
    try {
      const apiKey = import.meta.env.VITE_NEWS_API_KEY || '8e3f62954b60406ea19536f765a3f4cc';

const response = await fetch(`https://newsapi.org/v2/everything?q=police+cases+india&apiKey=${apiKey}&sortBy=publishedAt&pageSize=10`);

if (!response.ok) {

throw new Error(`News API error: ${response.status}`);

}

const data = await response.json();

setNews(data.articles || []);

} catch (error) {

console.error('Error fetching news:', error);

setNews([]); // Set empty array to stop loading spinner

}
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/complaints/profile`, { headers:{ Authorization: 'Bearer '+token }});
      setUserProfile(res.data);
      setProfileForm(res.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setModal({
        isOpen: true,
        title: 'Profile Load Error',
        message: 'Failed to load your profile. Please try logging in again.',
        type: 'error',
        onConfirm: () => navigate('/login')
      });
    }
  };

  const downloadFile = async (fileId, filename) => {
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
    } catch (err) {
      console.error('Error downloading file:', err);
      setModal({
        isOpen: true,
        title: 'Download Error',
        message: 'Failed to download the file. Please try again.',
        type: 'error'
      });
    }
  };

  const viewFile = async (fileId) => {
    try {
      const response = await axios.get(`${API}/complaints/files/${fileId}`, {
        headers: { Authorization: 'Bearer ' + token },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error viewing file:', err);
      setModal({
        isOpen: true,
        title: 'View Error',
        message: 'Failed to view the file. Please try again.',
        type: 'error'
      });
    }
  };

  useEffect(()=>{ fetchCases(); fetchNews(); fetchProfile(); }, [typeFilter, sortOrder]);

  const getGPS = async () => {
    setGpsLoading(true);
    if(navigator.geolocation){
      const options = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          console.log('GPS Coordinates:', lat, lon); // Debug log

          try {
            // Try multiple geocoding services for better accuracy
            let loc = '';

            // First try: OpenStreetMap Nominatim for better accuracy
            try {
              const nominatimResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=en`,
                {
                  headers: {
                    'User-Agent': 'ComplaintSystem/1.0'
                  }
                }
              );

              if (nominatimResponse.ok) {
                const nominatimData = await nominatimResponse.json();
                console.log('Nominatim data:', nominatimData); // Debug log

                if (nominatimData && nominatimData.display_name) {
                  // Extract meaningful parts from the address
                  const address = nominatimData.address || {};
                  const parts = [];

                  if (address.road) parts.push(address.road);
                  if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood);
                  if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
                  if (address.state) parts.push(address.state);
                  if (address.country) parts.push(address.country);

                  loc = parts.length > 0 ? parts.join(', ') : nominatimData.display_name.split(', ').slice(0, 3).join(', ');
                }
              }
            } catch (nominatimError) {
              console.warn('Nominatim failed:', nominatimError);
            }

            // Second try: BigDataCloud as backup
            if (!loc) {
              try {
                const bdcResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                if (bdcResponse.ok) {
                  const bdcData = await bdcResponse.json();
                  console.log('BigDataCloud data:', bdcData); // Debug log

                  if (bdcData.city && bdcData.locality) {
                    loc = `${bdcData.locality}, ${bdcData.city}, ${bdcData.countryName}`;
                  } else if (bdcData.city) {
                    loc = `${bdcData.city}, ${bdcData.countryName}`;
                  } else if (bdcData.locality) {
                    loc = `${bdcData.locality}, ${bdcData.countryName}`;
                  } else if (bdcData.principalSubdivision) {
                    loc = `${bdcData.principalSubdivision}, ${bdcData.countryName}`;
                  }
                }
              } catch (bdcError) {
                console.warn('BigDataCloud failed:', bdcError);
              }
            }

            // Third try: Google Maps Geocoding API as final backup (requires API key)
            if (!loc) {
              try {
                // NOTE: Replacing placeholder with dynamic variable. The user should replace 'YOUR_GOOGLE_MAPS_API_KEY' with their actual key.
                const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
                const googleResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${googleMapsApiKey}`);
                if (googleResponse.ok) {
                  const googleData = await googleResponse.json();
                  console.log('Google Maps data:', googleData); // Debug log

                  if (googleData.results && googleData.results.length > 0) {
                    const addressComponents = googleData.results[0].address_components;
                    const parts = [];

                    // Extract city, state, country
                    for (const component of addressComponents) {
                      if (component.types.includes('locality')) {
                        parts.push(component.long_name); // City
                      } else if (component.types.includes('administrative_area_level_1')) {
                        parts.push(component.long_name); // State
                      } else if (component.types.includes('country')) {
                        parts.push(component.long_name); // Country
                      }
                    }

                    if (parts.length > 0) {
                      loc = parts.join(', ');
                    } else {
                      loc = googleData.results[0].formatted_address.split(', ').slice(-3).join(', ');
                    }
                  }
                }
              } catch (googleError) {
                console.warn('Google Maps failed:', googleError);
              }
            }

            // Final fallback: Use coordinates
            if (!loc) {
              loc = `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
            }

            console.log('Final location:', loc); // Debug log
            setForm({...form, location: loc});

          } catch (error) {
            console.error('Geocoding error:', error);
            // Fallback to coordinates
            const loc = `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
            setForm({...form, location: loc});
          }
          setGpsLoading(false);
        },
        (err) => {
          console.error('GPS error:', err);
          let errorMsg = 'Unable to get location';
          switch(err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = 'Location access denied. Please enable location permissions and refresh the page.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg = 'Location information unavailable. Please check your GPS settings.';
              break;
            case err.TIMEOUT:
              errorMsg = 'Location request timed out. Please try again.';
              break;
          }
          alert(errorMsg);
          setGpsLoading(false);
        },
        options
      );
    }else{
      alert('Geolocation is not supported by this browser. Please use a modern browser or enter location manually.');
      setGpsLoading(false);
    }
  };

  const validateDateTime = (date, time) => {
    if (!date || !time) return { dateError: '', timeError: '' };

    const now = new Date();
    const selectedDateTime = new Date(`${date}T${time}`);

    if (selectedDateTime > now) {
      return { dateError: 'Future dates and times are not allowed', timeError: '' };
    }

    return { dateError: '', timeError: '' };
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setForm({...form, date: newDate});

    // Check if selected date is in the future
    const now = new Date();
    const selectedDate = new Date(newDate + 'T00:00:00');
    if (selectedDate > now) {
      setDateError('Please select a date that is not in the future.');
    } else {
      setDateError('');
    }

    // Also check time if both date and time are set
    if (form.time) {
      const selectedDateTime = new Date(newDate + 'T' + form.time);
      if (selectedDateTime > now) {
        setTimeError('Please select a time that is not in the future.');
      } else {
        setTimeError('');
      }
    }
  };

  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    setForm({...form, time: newTime});

    // Check if selected date/time is in the future
    if (form.date) {
      const now = new Date();
      const selectedDateTime = new Date(form.date + 'T' + newTime);
      if (selectedDateTime > now) {
        setTimeError('Please select a time that is not in the future.');
      } else {
        setTimeError('');
      }
    }
  };

  const handleEditDateChange = (e) => {
    const newDate = e.target.value;
    setEditForm({...editForm, date: newDate});
    const errors = validateDateTime(newDate, editForm.time);
    setEditDateError(errors.dateError);
    setEditTimeError(errors.timeError);
  };

  const handleEditTimeChange = (e) => {
    const newTime = e.target.value;
    setEditForm({...editForm, time: newTime});
    const errors = validateDateTime(editForm.date, newTime);
    setEditDateError(errors.dateError);
    setEditTimeError(errors.timeError);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if date/time is in future
    const now = new Date();
    const selectedDateTime = new Date(`${form.date}T${form.time}`);
    if (selectedDateTime > now) {
      setDateError('Please select a date and time that are not in the future.');
      setTimeError('Please select a date and time that are not in the future.');
      return;
    }

    const formData = new FormData();
    Object.keys(form).forEach(k => {
      if (k === 'accusedDetails') {
        // Filter out completely empty accused details and only append if there are filled ones
        const filteredAccused = form.accusedDetails.filter(accused => {
          return accused.name || accused.alias || accused.age || accused.address || accused.status || accused.remarks;
        });
        if (filteredAccused.length > 0) {
          formData.append(k, JSON.stringify(filteredAccused));
        }
      } else if (k === 'victimDetails') {
        // Filter out completely empty victim details and only append if there are filled ones
        const filteredVictims = form.victimDetails.filter(victim => {
          return victim.name || victim.gender || victim.age || victim.address || victim.injuryLoss;
        });
        if (filteredVictims.length > 0) {
          formData.append(k, JSON.stringify(filteredVictims));
        }
      } else {
        formData.append(k, form[k]);
      }
    });
    files.forEach(f => formData.append('evidence', f));

    // Prepare headers conditionally based on anonymous status
    const headers = { 'Content-Type': 'multipart/form-data' };
    if (!form.anonymous) {
      headers.Authorization = 'Bearer ' + token;
    }

    try{
      await axios.post(`${API}/complaints/file`, formData, { headers });
      setModal({
        isOpen: true,
        title: 'Success',
        message: 'Your complaint has been submitted successfully!',
        type: 'success'
      });
      setForm({
        type:'', date:'', time:'', location:'', nearestLandmark:'', description:'', anonymous:false,
        relationToVictim: '',
        accusedDetails: [{ name: '', alias: '', age: '', address: '', status: '', remarks: '' }],
        victimDetails: [{ name: '', gender: '', age: '', address: '', injuryLoss: '' }]
      });
      setFiles([]);
      setDateError('');
      setTimeError('');
      fetchCases();
    }catch(err){
      setModal({
        isOpen: true,
        title: 'Submission Error',
        message: err.response?.data?.msg || 'Failed to submit complaint. Please try again.',
        type: 'error'
      });
      console.error(err);
    }
  };

  const handleEmergency = async () => {
    const formData = new FormData();
    formData.append('type', 'Emergency');
    formData.append('location', form.location || 'Unknown');
    formData.append('description', 'Emergency report');
    files.forEach(f => formData.append('evidence', f));
    try{
      await axios.post(`${API}/complaints/emergency`, formData, { headers:{ Authorization: 'Bearer '+token, 'Content-Type': 'multipart/form-data' }});
      setModal({
        isOpen: true,
        title: 'Emergency Submitted',
        message: 'Your emergency complaint has been submitted successfully!',
        type: 'success'
      });
      setFiles([]);
      fetchCases();
    }catch(err){
      setModal({
        isOpen: true,
        title: 'Emergency Error',
        message: err.response?.data?.msg || 'Failed to submit emergency complaint. Please try again.',
        type: 'error'
      });
      console.error(err);
    }
  };

  const startEdit = (c) => {
    setEditing(c._id);
    setEditForm({
      type: c.type,
      date: c.date ? new Date(c.date).toISOString().split('T')[0] : '',
      time: c.time ? c.time.substring(0, 5) : '',
      location: c.location,
      nearestLandmark: c.nearestLandmark || '',
      description: c.description,
      anonymous: c.anonymous || false,
      relationToVictim: c.relationToVictim || '',
      accusedDetails: c.accusedDetails || [{ name: '', alias: '', age: '', address: '', status: '', remarks: '' }],
      victimDetails: c.victimDetails || [{ name: '', gender: '', age: '', address: '', injuryLoss: '' }]
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();

    // Check if date/time is in future
    const now = new Date();
    const selectedDateTime = new Date(`${editForm.date}T${editForm.time}`);
    if (selectedDateTime > now) {
      setEditDateError('Please select a date and time that are not in the future.');
      setEditTimeError('Please select a date and time that are not in the future.');
      return;
    }

    const formData = new FormData();
    Object.keys(editForm).forEach(k => {
      if (k === 'accusedDetails' || k === 'victimDetails') {
        formData.append(k, JSON.stringify(editForm[k]));
      } else {
        formData.append(k, editForm[k]);
      }
    });

    try{
      await axios.put(`${API}/complaints/${editing}/edit`, formData, { headers:{ Authorization: 'Bearer '+token, 'Content-Type': 'multipart/form-data' }});
      setModal({
        isOpen: true,
        title: 'Update Successful',
        message: 'Your complaint has been updated successfully!',
        type: 'success'
      });
      setEditing(null);
      setEditDateError('');
      setEditTimeError('');
      fetchCases();
    }catch(err){
      setModal({
        isOpen: true,
        title: 'Update Error',
        message: err.response?.data?.msg || 'Failed to update complaint. Please try again.',
        type: 'error'
      });
      console.error(err);
    }
  };

  const handleWithdraw = async (id) => {
    setModal({
      isOpen: true,
      title: 'Confirm Withdrawal',
      message: 'Are you sure you want to withdraw this complaint?',
      type: 'confirm',
      onConfirm: async () => {
        try{
          await axios.post(`${API}/complaints/${id}/withdraw`, {}, { headers:{ Authorization: 'Bearer '+token }});
          setModal({
            isOpen: true,
            title: 'Withdrawal Successful',
            message: 'Your complaint has been withdrawn successfully!',
            type: 'success'
          });
          fetchCases();
        }catch(err){
          setModal({
            isOpen: true,
            title: 'Withdrawal Error',
            message: err.response?.data?.msg || 'Failed to withdraw complaint. Please try again.',
            type: 'error'
          });
          console.error(err);
        }
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${API}/complaints/profile`, profileForm, { headers:{ Authorization: 'Bearer '+token }});
      setUserProfile(res.data.user);
      setIsEditingProfile(false);
      setModal({
        isOpen: true,
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully!',
        type: 'success'
      });
    } catch (error) {
      setModal({
        isOpen: true,
        title: 'Update Error',
        message: error.response?.data?.msg || 'Failed to update profile. Please try again.',
        type: 'error'
      });
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
  
      
      <div className="flex">
      <div className="w-64 bg-white shadow-xl p-6 border-r border-gray-200">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Navigation</h2>
          <div className="h-1 bg-gray-300 rounded-full"></div>
        </div>
        <ul className="space-y-2">
          <li>
            <button onClick={() => { setActiveSection('latest-news'); localStorage.setItem('activeSection', 'latest-news'); }} className={`group w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeSection === 'latest-news' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}>
              <div className="flex items-center space-x-3">
                <svg className={`w-5 h-5 transition-colors duration-300 ${activeSection === 'latest-news' ? 'text-white' : 'text-blue-500 group-hover:text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <span className="font-medium">Latest News</span>
              </div>
            </button>
          </li>
          <li>
            <button onClick={() => { setActiveSection('report'); localStorage.setItem('activeSection', 'report'); }} className={`group w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeSection === 'report' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}>
              <div className="flex items-center space-x-3">
                <svg className={`w-5 h-5 transition-colors duration-300 ${activeSection === 'report' ? 'text-white' : 'text-blue-500 group-hover:text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium">Report</span>
              </div>
            </button>
          </li>
          <li>
            <button onClick={() => { setActiveSection('my-reports'); localStorage.setItem('activeSection', 'my-reports'); }} className={`group w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeSection === 'my-reports' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}>
              <div className="flex items-center space-x-3">
                <svg className={`w-5 h-5 transition-colors duration-300 ${activeSection === 'my-reports' ? 'text-white' : 'text-blue-500 group-hover:text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-medium">My Reports</span>
              </div>
            </button>
          </li>
          <li>
            <button onClick={() => { setActiveSection('contact-helpline'); localStorage.setItem('activeSection', 'contact-helpline'); }} className={`group w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeSection === 'contact-helpline' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}>
              <div className="flex items-center space-x-3">
                <Phone className={`w-5 h-5 transition-colors duration-300 ${activeSection === 'contact-helpline' ? 'text-white' : 'text-blue-500 group-hover:text-blue-600'}`} />
                <span className="font-medium">Contact Helpline</span>
              </div>
            </button>
          </li>
                  <li>
                    <button onClick={() => { setActiveSection('safety-tips'); localStorage.setItem('activeSection', 'safety-tips'); }} className={`group w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeSection === 'safety-tips' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}>
                      <div className="flex items-center space-x-3">
                        <Shield className={`w-5 h-5 transition-colors duration-300 ${activeSection === 'safety-tips' ? 'text-white' : 'text-blue-500 group-hover:text-blue-600'}`} />
                        <span className="font-medium">Safety Tips</span>
                      </div>
                    </button>
                  </li>
          <li>
            <button onClick={() => { setActiveSection('profile'); localStorage.setItem('activeSection', 'profile'); }} className={`group w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeSection === 'profile' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}>
              <div className="flex items-center space-x-3">
                <User className={`w-5 h-5 transition-colors duration-300 ${activeSection === 'profile' ? 'text-white' : 'text-blue-500 group-hover:text-blue-600'}`} />
                <span className="font-medium">Profile</span>
              </div>
            </button>
          </li>
          <li className="pt-4 border-t border-gray-200">
            <button onClick={handleLogout} className="group w-full text-left px-4 py-3 rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Logout</span>
              </div>
            </button>
          </li>
        </ul>
      </div>
      <div className="flex-1 p-6">
        {activeSection === 'report' && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Submit Complaint</h1>
              <p className="text-gray-600 text-lg">Report incidents safely and anonymously</p>
              <div className="h-1 bg-gray-300 rounded-full w-24 mt-2"></div>
            </div>
            <div className="bg-white shadow-lg rounded-lg p-8 mb-6 border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Submit Complaint</h3>
                  <p className="text-gray-600">Fill in the details below to file your complaint</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Incident Details */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-800">Incident Details</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-blue-600">Complaint Type *</label>
                      <select className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 bg-white" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required>
                        <option value=''>Select Type</option>
                        <option>Assault</option>
                        <option>Fraud</option>
                        <option>Harassment</option>
                        <option>Theft</option>
                        <option>Burglary</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-blue-600">Date & Time of Occurrence *</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 bg-white" type="date" value={form.date} onChange={handleDateChange} required />
                          {dateError && <p className="text-red-500 text-sm mt-2 animate-pulse">{dateError}</p>}
                        </div>
                        <div>
                          <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 bg-white" type="time" value={form.time} onChange={handleTimeChange} required />
                          {timeError && <p className="text-red-500 text-sm mt-2 animate-pulse">{timeError}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-blue-600">Place of Occurrence *</label>
                      <div className="flex">
                        <input className="flex-1 p-4 border-2 border-gray-200 rounded-l-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 bg-white" placeholder="Enter location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required />
                        <button type="button" onClick={getGPS} className="px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-r-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" disabled={gpsLoading}>
                          {gpsLoading ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-blue-600">Nearest Landmark / Area</label>
                      <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 bg-white" placeholder="Enter nearest landmark or area" value={form.nearestLandmark} onChange={e => setForm({ ...form, nearestLandmark: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* 2. Description and Evidence */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-800">Description and Evidence</h4>
                  </div>
                  <div className="space-y-6">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-purple-600">Relation to Victim</label>
                      <select className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 hover:border-purple-300 bg-white" value={form.relationToVictim} onChange={e => setForm({ ...form, relationToVictim: e.target.value })}>
                        <option value=''>Select Relation</option>
                        <option value="Self">Self</option>
                        <option value="Family">Family</option>
                        <option value="Employer">Employer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-purple-600">Brief Narrative of Incident *</label>
                      <textarea className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 hover:border-purple-300 bg-white resize-none" rows="4" placeholder="Describe the incident in detail" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required></textarea>
                    </div>
                    <div className="flex items-center p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-all duration-300">
                      <input type="checkbox" checked={form.anonymous} onChange={e => setForm({ ...form, anonymous: e.target.checked })} className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2" />
                      <label className="ml-3 text-sm font-semibold text-gray-700">Report Anonymously</label>
                      <EyeOff className="w-5 h-5 ml-2 text-purple-500" />
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-purple-600">Evidence Files (Photo, Video, Audio, PDF, DOC)</label>
                      <div className="relative">
                        <input type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={e => setFiles(Array.from(e.target.files))} className="w-full p-4 border-2 border-gray-200 border-dashed rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 hover:border-purple-300 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                        <div className="absolute inset-0 rounded-xl pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                            Click to upload files
                          </div>
                        </div>
                      </div>
                      {files.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {files.map((file, index) => (
                            <div key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {file.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Victim / Affected Party */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-800">Victim / Affected Party</h4>
                  </div>
                  <div className="space-y-6">
                    {form.victimDetails.map((victim, index) => (
                      <div key={index} className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-green-300 transition-all duration-300 shadow-sm hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-lg font-semibold text-gray-800">Victim {index + 1}</h5>
                          {form.victimDetails.length > 1 && (
                            <button type="button" onClick={() => { const newVictim = form.victimDetails.filter((_, i) => i !== index); setForm({ ...form, victimDetails: newVictim }); }} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all duration-300 transform hover:scale-105">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-green-600">Name</label>
                            <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-300 bg-white" placeholder="Enter name" value={victim.name} onChange={e => { const newVictim = [...form.victimDetails]; newVictim[index].name = e.target.value; setForm({ ...form, victimDetails: newVictim }); }} />
                          </div>
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-green-600">Gender</label>
                            <select className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-300 bg-white" value={victim.gender} onChange={e => { const newVictim = [...form.victimDetails]; newVictim[index].gender = e.target.value; setForm({ ...form, victimDetails: newVictim }); }}>
                              <option value=''>Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-green-600">Age</label>
                            <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-300 bg-white" placeholder="Enter age" value={victim.age} onChange={e => { const newVictim = [...form.victimDetails]; newVictim[index].age = e.target.value; setForm({ ...form, victimDetails: newVictim }); }} />
                          </div>
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-green-600">Address</label>
                            <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-300 bg-white" placeholder="Enter address" value={victim.address} onChange={e => { const newVictim = [...form.victimDetails]; newVictim[index].address = e.target.value; setForm({ ...form, victimDetails: newVictim }); }} />
                          </div>
                          <div className="group md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-green-600">Injury / Loss</label>
                            <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-300 bg-white" placeholder="Describe injury or loss" value={victim.injuryLoss} onChange={e => { const newVictim = [...form.victimDetails]; newVictim[index].injuryLoss = e.target.value; setForm({ ...form, victimDetails: newVictim }); }} />
                          </div>

                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => { setForm({ ...form, victimDetails: [...form.victimDetails, { name: '', gender: '', age: '', address: '', injuryLoss: '' }] }); }} className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center font-semibold">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Victim
                    </button>
                  </div>
                </div>

                {/* 4. Accused Details */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">4</span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-800">Accused Details</h4>
                  </div>
                  <div className="space-y-6">
                    {form.accusedDetails.map((accused, index) => (
                      <div key={index} className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-orange-300 transition-all duration-300 shadow-sm hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-lg font-semibold text-gray-800">Accused {index + 1}</h5>
                          {form.accusedDetails.length > 1 && (
                            <button type="button" onClick={() => { const newAccused = form.accusedDetails.filter((_, i) => i !== index); setForm({ ...form, accusedDetails: newAccused }); }} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all duration-300 transform hover:scale-105">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-orange-600">Name</label>
                            <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 hover:border-orange-300 bg-white" placeholder="Enter name" value={accused.name} onChange={e => { const newAccused = [...form.accusedDetails]; newAccused[index].name = e.target.value; setForm({ ...form, accusedDetails: newAccused }); }} />
                          </div>
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-orange-600">Alias</label>
                            <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 hover:border-orange-300 bg-white" placeholder="Enter alias" value={accused.alias} onChange={e => { const newAccused = [...form.accusedDetails]; newAccused[index].alias = e.target.value; setForm({ ...form, accusedDetails: newAccused }); }} />
                          </div>
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-orange-600">Age</label>
                            <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 hover:border-orange-300 bg-white" placeholder="Enter age" value={accused.age} onChange={e => { const newAccused = [...form.accusedDetails]; newAccused[index].age = e.target.value; setForm({ ...form, accusedDetails: newAccused }); }} />
                          </div>
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-orange-600">Address</label>
                            <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 hover:border-orange-300 bg-white" placeholder="Enter address" value={accused.address} onChange={e => { const newAccused = [...form.accusedDetails]; newAccused[index].address = e.target.value; setForm({ ...form, accusedDetails: newAccused }); }} />
                          </div>
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-orange-600">Status</label>
                            <select className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 hover:border-orange-300 bg-white" value={accused.status} onChange={e => { const newAccused = [...form.accusedDetails]; newAccused[index].status = e.target.value; setForm({ ...form, accusedDetails: newAccused }); }}>
                              <option value=''>Select Status</option>
                              <option value="Arrested">Arrested</option>
                              <option value="Absconding">Absconding</option>
                            </select>
                          </div>
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-orange-600">Remarks</label>
                            <input className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 hover:border-orange-300 bg-white" placeholder="Enter remarks" value={accused.remarks} onChange={e => { const newAccused = [...form.accusedDetails]; newAccused[index].remarks = e.target.value; setForm({ ...form, accusedDetails: newAccused }); }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => { setForm({ ...form, accusedDetails: [...form.accusedDetails, { name: '', alias: '', age: '', address: '', status: '', remarks: '' }] }); }} className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center font-semibold">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Accused
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <button className="flex-1 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center font-semibold text-lg" type="submit">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Complaint
                  </button>
                  <button type="button" onClick={handleEmergency} className="flex-1 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center font-semibold text-lg">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Emergency Report
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
        {activeSection === 'my-reports' && (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">My Reports</h1>
                <div className="h-1 bg-gray-300 rounded-full w-24"></div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
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
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    <option value="recent">Recent First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>

            {cases.length === 0 ? (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-12 text-center border border-gray-200">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Reports Yet</h3>
                <p className="text-gray-500 mb-6">You haven't submitted any reports yet. Start by filing your first complaint.</p>
                <button
                  onClick={() => setActiveSection('report')}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  File Your First Report
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {cases.map(c => {
                  const getTypeIcon = (type) => {
                    switch (type) {
                      case 'Assault': return '👊';
                      case 'Fraud': return '💰';
                      case 'Harassment': return '😠';
                      case 'Theft': return '🕵️';
                      case 'Burglary': return '🏠';
                      case 'Emergency': return '🚨';
                      default: return '📋';
                    }
                  };

                  const getStatusConfig = (status) => {
                    switch (status) {
                      case 'Submitted':
                        return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: '⏳' };
                      case 'Under Review':
                        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: '🔍' };
                      case 'Investigation':
                        return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: '🕵️' };
                      case 'Closed':
                        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: '✅' };
                      default:
                        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: '❓' };
                    }
                  };

                  const statusConfig = getStatusConfig(c.status);

                  return (
                    <div key={c._id} className="bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">{getTypeIcon(c.type)}</div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-800">{c.type}</h3>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {c.location}
                              </p>
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-full text-sm font-semibold border flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                            <span>{statusConfig.icon}</span>
                            {c.status}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <p className="text-gray-700 mb-4 line-clamp-3">{c.description}</p>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10a2 2 0 002 2h4a2 2 0 002-2V11M9 11h6" />
                            </svg>
                            Evidence: {c.evidence?.length || 0} files
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Actions */}
                        {c.status === 'Submitted' && !c.anonymous && (
                          <div className="flex gap-3 mb-4">
                            <button
                              onClick={() => startEdit(c)}
                              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleWithdraw(c._id)}
                              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-300 flex items-center justify-center gap-2 font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Withdraw
                            </button>
                          </div>
                        )}

                        {/* Updates History */}
                        {c.updates && c.updates.length > 0 && (
                          <div className="border-t border-gray-100 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <h4 className="font-semibold text-gray-800">Update History</h4>
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {c.updates.map((u, i) => (
                                <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                                  <p className="text-gray-700">{u.note}</p>
                                  <p className="text-gray-500 text-xs mt-1">{new Date(u.createdAt).toLocaleString()}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Edit Form */}
                        {editing === c._id && (
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Report
                            </h4>
                            <form onSubmit={handleEdit} className="space-y-6">
                              {/* Basic Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Complaint Type</label>
                                  <select
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    value={editForm.type}
                                    onChange={e => setEditForm({...editForm, type: e.target.value})}
                                  >
                                    <option>Assault</option>
                                    <option>Fraud</option>
                                    <option>Harassment</option>
                                    <option>Theft</option>
                                    <option>Burglary</option>
                                    <option>Emergency</option>
                                    <option>Other</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                  <input
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    type="date"
                                    value={editForm.date}
                                    onChange={handleEditDateChange}
                                    max={new Date().toISOString().split('T')[0]}
                                  />
                                  {editDateError && <p className="text-red-500 text-sm mt-1">{editDateError}</p>}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                  <input
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    type="time"
                                    value={editForm.time}
                                    onChange={handleEditTimeChange}
                                  />
                                  {editTimeError && <p className="text-red-500 text-sm mt-1">{editTimeError}</p>}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                  <input
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    placeholder="Location"
                                    value={editForm.location}
                                    onChange={e => setEditForm({...editForm, location: e.target.value})}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nearest Landmark</label>
                                <input
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  placeholder="Nearest landmark or area"
                                  value={editForm.nearestLandmark}
                                  onChange={e => setEditForm({...editForm, nearestLandmark: e.target.value})}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                                  rows="3"
                                  placeholder="Description"
                                  value={editForm.description}
                                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Relation to Victim</label>
                                <select
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  value={editForm.relationToVictim}
                                  onChange={e => setEditForm({...editForm, relationToVictim: e.target.value})}
                                >
                                  <option value=''>Select Relation</option>
                                  <option value="Self">Self</option>
                                  <option value="Family">Family</option>
                                  <option value="Employer">Employer</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>

                              {/* Victim Details */}
                              {editForm.victimDetails && editForm.victimDetails.length > 0 && (
                                <div>
                                  <h5 className="text-lg font-semibold text-gray-800 mb-3">Victim Details</h5>
                                  <div className="space-y-4">
                                    {editForm.victimDetails.map((victim, index) => (
                                      <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                                        <div className="flex justify-between items-center mb-3">
                                          <h6 className="font-medium text-gray-700">Victim {index + 1}</h6>
                                          {editForm.victimDetails.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newVictims = editForm.victimDetails.filter((_, i) => i !== index);
                                                setEditForm({ ...editForm, victimDetails: newVictims });
                                              }}
                                              className="text-red-600 hover:text-red-800"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                            </button>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <input
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Name"
                                            value={victim.name}
                                            onChange={e => {
                                              const newVictims = [...editForm.victimDetails];
                                              newVictims[index].name = e.target.value;
                                              setEditForm({ ...editForm, victimDetails: newVictims });
                                            }}
                                          />
                                          <select
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            value={victim.gender}
                                            onChange={e => {
                                              const newVictims = [...editForm.victimDetails];
                                              newVictims[index].gender = e.target.value;
                                              setEditForm({ ...editForm, victimDetails: newVictims });
                                            }}
                                          >
                                            <option value=''>Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                          </select>
                                          <input
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Age"
                                            value={victim.age}
                                            onChange={e => {
                                              const newVictims = [...editForm.victimDetails];
                                              newVictims[index].age = e.target.value;
                                              setEditForm({ ...editForm, victimDetails: newVictims });
                                            }}
                                          />
                                          <input
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Address"
                                            value={victim.address}
                                            onChange={e => {
                                              const newVictims = [...editForm.victimDetails];
                                              newVictims[index].address = e.target.value;
                                              setEditForm({ ...editForm, victimDetails: newVictims });
                                            }}
                                          />
                                          <input
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 md:col-span-2"
                                            placeholder="Injury/Loss"
                                            value={victim.injuryLoss}
                                            onChange={e => {
                                              const newVictims = [...editForm.victimDetails];
                                              newVictims[index].injuryLoss = e.target.value;
                                              setEditForm({ ...editForm, victimDetails: newVictims });
                                            }}
                                          />
                                          <div className="md:col-span-2 flex items-center">
                                            {/* Note: medicalAid is not in the initial form state, assuming it's a new field in the backend/data structure */}
                                            {/* <input
                                              type="checkbox"
                                              checked={victim.medicalAid}
                                              onChange={e => {
                                                const newVictims = [...editForm.victimDetails];
                                                newVictims[index].medicalAid = e.target.checked;
                                                setEditForm({ ...editForm, victimDetails: newVictims });
                                              }}
                                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label className="ml-2 text-sm font-medium text-gray-700">Medical Aid Provided</label> */}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditForm({
                                          ...editForm,
                                          victimDetails: [...editForm.victimDetails, { name: '', gender: '', age: '', address: '', injuryLoss: '' }]
                                        });
                                      }}
                                      className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                      Add Victim
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Accused Details */}
                              {editForm.accusedDetails && editForm.accusedDetails.length > 0 && (
                                <div>
                                  <h5 className="text-lg font-semibold text-gray-800 mb-3">Accused Details</h5>
                                  <div className="space-y-4">
                                    {editForm.accusedDetails.map((accused, index) => (
                                      <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                                        <div className="flex justify-between items-center mb-3">
                                          <h6 className="font-medium text-gray-700">Accused {index + 1}</h6>
                                          {editForm.accusedDetails.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newAccused = editForm.accusedDetails.filter((_, i) => i !== index);
                                                setEditForm({ ...editForm, accusedDetails: newAccused });
                                              }}
                                              className="text-red-600 hover:text-red-800"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                            </button>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <input
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Name"
                                            value={accused.name}
                                            onChange={e => {
                                              const newAccused = [...editForm.accusedDetails];
                                              newAccused[index].name = e.target.value;
                                              setEditForm({ ...editForm, accusedDetails: newAccused });
                                            }}
                                          />
                                          <input
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Alias"
                                            value={accused.alias}
                                            onChange={e => {
                                              const newAccused = [...editForm.accusedDetails];
                                              newAccused[index].alias = e.target.value;
                                              setEditForm({ ...editForm, accusedDetails: newAccused });
                                            }}
                                          />
                                          <input
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Age"
                                            value={accused.age}
                                            onChange={e => {
                                              const newAccused = [...editForm.accusedDetails];
                                              newAccused[index].age = e.target.value;
                                              setEditForm({ ...editForm, accusedDetails: newAccused });
                                            }}
                                          />
                                          <input
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Address"
                                            value={accused.address}
                                            onChange={e => {
                                              const newAccused = [...editForm.accusedDetails];
                                              newAccused[index].address = e.target.value;
                                              setEditForm({ ...editForm, accusedDetails: newAccused });
                                            }}
                                          />
                                          <select
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            value={accused.status}
                                            onChange={e => {
                                              const newAccused = [...editForm.accusedDetails];
                                              newAccused[index].status = e.target.value;
                                              setEditForm({ ...editForm, accusedDetails: newAccused });
                                            }}
                                          >
                                            <option value=''>Status</option>
                                            <option value="Arrested">Arrested</option>
                                            <option value="Absconding">Absconding</option>
                                          </select>
                                          <input
                                            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Remarks"
                                            value={accused.remarks}
                                            onChange={e => {
                                              const newAccused = [...editForm.accusedDetails];
                                              newAccused[index].remarks = e.target.value;
                                              setEditForm({ ...editForm, accusedDetails: newAccused });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditForm({
                                          ...editForm,
                                          accusedDetails: [...editForm.accusedDetails, { name: '', alias: '', age: '', address: '', status: '', remarks: '' }]
                                        });
                                      }}
                                      className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                      Add Accused
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-3">
                                <button
                                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all duration-300 flex items-center justify-center gap-2 font-medium"
                                  type="submit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Update Report
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditing(null)}
                                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center justify-center gap-2 font-medium"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {activeSection === 'latest-news' && (
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Latest News</h1>
              <p className="text-gray-600 text-lg">Stay informed with the latest police and crime-related news</p>
              <div className="h-1 bg-gray-300 rounded-full w-24 mt-2"></div>
            </div>
            {news.length === 0 ? (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-12 text-center border border-gray-200">
                <Newspaper className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No News Available</h3>
                <p className="text-gray-500">Unable to load latest news at this time. Please try again later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((article, index) => (
                  // Ensured consistent, modern card styling
                  <div key={index} className="bg-white rounded-xl border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl flex flex-col overflow-hidden">
                    {article.urlToImage ? (
                        <img src={article.urlToImage} alt={article.title} className="w-full h-40 object-cover" />
                    ) : (
                        <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                            <Newspaper className="w-10 h-10 text-gray-500" />
                        </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">{article.description}</p>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <a href={article.url} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-[1.02] shadow-md flex items-center gap-2 font-semibold text-sm">
                                Read More
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                            <div className="text-xs text-gray-500">
                                {new Date(article.publishedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                            </div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeSection === 'contact-helpline' && (
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Contact Helpline</h1>
              <p className="text-gray-600 text-lg">Emergency and support contact numbers</p>
              <div className="h-1 bg-gray-300 rounded-full w-24 mt-2"></div>
            </div>
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-red-800">Emergency Services</h2>
                    <p className="text-red-600">For immediate assistance</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-red-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-red-700 text-lg">Police Emergency</p>
                          <p className="text-sm text-red-600">For immediate police assistance</p>
                        </div>
                      </div>
                      <a href="tel:100" className="bg-red-600 text-white px-8 py-3 rounded-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-3 font-semibold text-lg">
                        <Phone className="w-5 h-5" />
                        Call 100
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-blue-800">Tamil Nadu Government Helplines</h2>
                    <p className="text-blue-600">State government support services</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-700 text-lg">Women Helpline</h3>
                        <p className="text-sm text-blue-600">For women in distress</p>
                      </div>
                    </div>
                    <a href="tel:1091" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold">
                      <Phone className="w-4 h-4" />
                      1091
                    </a>
                  </div>
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-700 text-lg">Child Helpline</h3>
                        <p className="text-sm text-blue-600">For children in need</p>
                      </div>
                    </div>
                    <a href="tel:1098" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold">
                      <Phone className="w-4 h-4" />
                      1098
                    </a>
                  </div>
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-700 text-lg">Senior Citizen Helpline</h3>
                        <p className="text-sm text-blue-600">For elderly assistance</p>
                      </div>
                    </div>
                    <a href="tel:12500" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold">
                      <Phone className="w-4 h-4" />
                      12500
                    </a>
                  </div>
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-700 text-lg">Medical Emergency</h3>
                        <p className="text-sm text-blue-600">Ambulance services</p>
                      </div>
                    </div>
                    <a href="tel:108" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold">
                      <Phone className="w-4 h-4" />
                      108
                    </a>
                  </div>
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-700 text-lg">Fire Service</h3>
                        <p className="text-sm text-blue-600">Fire emergency</p>
                      </div>
                    </div>
                    <a href="tel:101" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold">
                      <Phone className="w-4 h-4" />
                      101
                    </a>
                  </div>
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-700 text-lg">Disaster Management</h3>
                        <p className="text-sm text-blue-600">Natural disasters</p>
                      </div>
                    </div>
                    <a href="tel:1077" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold">
                      <Phone className="w-4 h-4" />
                      1077
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-green-800">Other Important Numbers</h2>
                    <p className="text-green-600">Essential services and utilities</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-green-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-green-700 text-lg">Electricity Complaint</h3>
                        <p className="text-sm text-green-600">TANGEDCO</p>
                      </div>
                    </div>
                    <a href="tel:1912" className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold">
                      <Phone className="w-4 h-4" />
                      1912
                    </a>
                  </div>
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-green-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l7 7m-7-7h14" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-green-700 text-lg">Water Supply</h3>
                        <p className="text-sm text-green-600">Metrowater Chennai</p>
                      </div>
                    </div>
                    <a href="tel:1916" className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold">
                      <Phone className="w-4 h-4" />
                      1916
                    </a>
                  </div>
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-green-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-green-700 text-lg">Traffic Police</h3>
                        <p className="text-sm text-green-600">Traffic violations</p>
                      </div>
                    </div>
                    <a href="tel:103" className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold">
                      <Phone className="w-4 h-4" />
                      103
                    </a>
                  </div>
                  <div className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-green-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-green-700 text-lg">Railway Enquiry</h3>
                        <p className="text-sm text-green-600">Indian Railways</p>
                      </div>
                    </div>
                    <a href="tel:139" className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold">
                      <Phone className="w-4 h-4" />
                      139
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'safety-tips' && (
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Safety Tips</h1>
              <p className="text-gray-600 text-lg">Essential safety guidelines to protect yourself and others</p>
              <div className="h-1 bg-gray-300 rounded-full w-24 mt-2"></div>
            </div>
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-blue-800">Personal Safety</h2>
                    <p className="text-blue-600">Stay safe in your daily life</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Stay Aware
                    </h3>
                    <p className="text-sm text-gray-600">Be conscious of your surroundings. Avoid distractions like phones when walking alone.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Trust Your Instincts
                    </h3>
                    <p className="text-sm text-gray-600">If something feels wrong, leave the situation immediately. Don't ignore your gut feelings.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Share Your Plans
                    </h3>
                    <p className="text-sm text-gray-600">Let trusted friends or family know your plans and check in regularly.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Emergency Contacts
                    </h3>
                    <p className="text-sm text-gray-600">Save emergency numbers (100, 108, 1091) on speed dial and keep your phone charged.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-green-800">Online Safety</h2>
                    <p className="text-green-600">Protect yourself in the digital world</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-green-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Protect Personal Information
                    </h3>
                    <p className="text-sm text-gray-600">Don't share sensitive information like address, phone, or financial details online.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-green-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Use Strong Passwords
                    </h3>
                    <p className="text-sm text-gray-600">Create complex passwords and use different ones for different accounts.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-green-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verify Sources
                    </h3>
                    <p className="text-sm text-gray-600">Be cautious of suspicious emails, links, or requests for personal information.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-green-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Report Cybercrimes
                    </h3>
                    <p className="text-sm text-gray-600">Report online harassment, fraud, or threats to authorities immediately.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-purple-800">Home Security</h2>
                    <p className="text-purple-600">Secure your living space</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-purple-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Secure Doors & Windows
                    </h3>
                    <p className="text-sm text-gray-600">Install strong locks, deadbolts, and consider security bars or reinforced doors.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-purple-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Lighting
                    </h3>
                    <p className="text-sm text-gray-600">Keep exterior areas well-lit and use motion-sensor lights around entrances.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-purple-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h2M7 14h2" />
                      </svg>
                      Security Systems
                    </h3>
                    <p className="text-sm text-gray-600">Consider installing alarms, CCTV cameras, or smart home security systems.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-purple-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Neighborhood Watch
                    </h3>
                    <p className="text-sm text-gray-600">Get to know your neighbors and participate in community safety programs.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-red-800">Emergency Preparedness</h2>
                    <p className="text-red-600">Be ready for emergencies</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-red-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Emergency Kit
                    </h3>
                    <p className="text-sm text-gray-600">Prepare a kit with water, food, medications, flashlight, and important documents.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-red-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Family Plan
                    </h3>
                    <p className="text-sm text-gray-600">Create a family emergency plan with meeting points and communication strategies.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-red-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Know Emergency Numbers
                    </h3>
                    <p className="text-sm text-gray-600">Police: 100, Fire: 101, Ambulance: 108, Women Helpline: 1091</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-red-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                      Stay Informed
                    </h3>
                    <p className="text-sm text-gray-600">Monitor local news and weather alerts for potential emergencies.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-yellow-800">Important Reminders</h2>
                    <p className="text-yellow-600">Key points to remember</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-yellow-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <p className="text-sm text-gray-700">
                      <strong>Report Immediately:</strong> Don't hesitate to report suspicious activities or crimes. Early reporting can prevent escalation.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-yellow-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <p className="text-sm text-gray-700">
                      <strong>Preserve Evidence:</strong> After an incident, if safe, try to take photos, videos, or collect contact information for witnesses before reporting.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-yellow-300 transition-all duration-300 shadow-sm hover:shadow-md">
                    <p className="text-sm text-gray-700">
                      <strong>Use Anonymity Wisely:</strong> The anonymous feature is for your safety, but providing details (even anonymously) is crucial for investigation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'profile' && (
          <div className="bg-white shadow-lg rounded-lg p-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800">My Profile</h1>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>

            {!isEditingProfile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 shadow-md">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Personal Information
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-blue-100">
                        <span className="text-gray-600 font-medium">Full Name:</span>
                        <span className="text-gray-800 font-semibold">{userProfile.fullName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-blue-100">
                        <span className="text-gray-600 font-medium">Email:</span>
                        <span className="text-gray-800 font-semibold">{userProfile.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-blue-100">
                        <span className="text-gray-600 font-medium">Phone:</span>
                        <span className="text-gray-800 font-semibold">{userProfile.phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600 font-medium">Aadhar:</span>
                        <span className="text-gray-800 font-semibold">{userProfile.aadhar || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200 shadow-md">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Address & Location
                    </h2>
                    <div className="space-y-3">
                      <div className="py-2">
                        <span className="text-gray-600 font-medium">Address:</span>
                        <p className="text-gray-800 font-semibold mt-1 leading-relaxed">{userProfile.address || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200 shadow-md">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10a2 2 0 002 2h4a2 2 0 002-2V11M9 11h6" />
                      </svg>
                      Additional Details
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-purple-100">
                        <span className="text-gray-600 font-medium">Gender:</span>
                        <span className="text-gray-800 font-semibold">{userProfile.gender || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-purple-100">
                        <span className="text-gray-600 font-medium">Date of Birth:</span>
                        <span className="text-gray-800 font-semibold">{userProfile.dob ? new Date(userProfile.dob).toLocaleDateString() : 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600 font-medium">Account Role:</span>
                        <span className="text-gray-800 font-semibold capitalize">{userProfile.role}</span>
                      </div>
                    </div>
                  </div>


                  {/* Adding the Important Reminder block from the Safety Tips section to fill the space and follow the theme */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 shadow-md">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-yellow-800">Security Note</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      <strong>Email cannot be changed:</strong> Your primary email address is linked to your account ID for security and cannot be modified. Contact support for critical changes.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 shadow-md">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800">Edit Profile</h2>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors duration-200 p-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.fullName || ''}
                        onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="text"
                        value={profileForm.phone || ''}
                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar</label>
                      <input
                        type="text"
                        value={profileForm.aadhar || ''}
                        onChange={(e) => setProfileForm({...profileForm, aadhar: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Enter your Aadhar number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                      <select
                        value={profileForm.gender || ''}
                        onChange={(e) => setProfileForm({...profileForm, gender: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      value={profileForm.address || ''}
                      onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      rows="4"
                      placeholder="Enter your address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={profileForm.dob ? new Date(profileForm.dob).toISOString().split('T')[0] : ''}
                      onChange={(e) => setProfileForm({...profileForm, dob: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    />
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
      />
    </div>
  );
}