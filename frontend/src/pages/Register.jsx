 import React, {useState} from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

export default function Register(){
  const [form,setForm] = useState({ fullName:'', email:'', phone:'', aadhar:'', address:'', gender:'', dob:'', password:'', confirmPassword:'' });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [errors, setErrors] = useState({ fullName:'', email:'', phone:'', aadhar:'', password:'', confirmPassword:'' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  function update(k,v){
    setForm(prev=>({...prev,[k]:v}));
    validateField(k, v);
  }

  const validateField = (field, value) => {
    let error = '';
    switch(field) {
      case 'fullName':
        const nameRegex = /^[A-Za-z\s]+$/;
        if(value && !nameRegex.test(value)) {
          error = 'Name must contain only letters and spaces';
        }
        break;
      case 'email':
        if(value && !value.includes('@')) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if(value && !/^\d{10}$/.test(value)) {
          error = 'Phone number must be exactly 10 digits';
        }
        break;
      case 'aadhar':
        if(value && !/^\d{12}$/.test(value)) {
          error = 'Aadhar number must be exactly 12 digits';
        }
        break;
      case 'dob':
        if(value) {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if(selectedDate > today) {
            error = 'Date of birth cannot be in the future';
          }
        }
        break;
      case 'password':
        const pwRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        if(value && !pwRules.test(value)) {
          error = 'Password must be at least 8 characters with uppercase, lowercase, number and special character';
        }
        break;
      case 'confirmPassword':
        if(value && value !== form.password) {
          error = 'Passwords do not match';
        }
        break;
      default:
        break;
    }
    setErrors(prev => ({...prev, [field]: error}));
  };

  const validateLocal = () => {
    const nameRegex = /^[A-Za-z\s]+$/;
    if(!form.fullName || !nameRegex.test(form.fullName)) {
      setModal({
        isOpen: true,
        title: 'Invalid Name',
        message: 'Please enter a valid name with only letters and spaces.',
        type: 'error'
      });
      return false;
    }
    if(!form.phone || !/^\d{10}$/.test(form.phone)) {
      setModal({
        isOpen: true,
        title: 'Invalid Phone',
        message: 'Phone number must be exactly 10 digits.',
        type: 'error'
      });
      return false;
    }
    if(!form.aadhar || !/^\d{12}$/.test(form.aadhar)) {
      setModal({
        isOpen: true,
        title: 'Invalid Aadhar',
        message: 'Aadhar number must be exactly 12 digits.',
        type: 'error'
      });
      return false;
    }
    const pwRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if(!form.password || !pwRules.test(form.password)) {
      setModal({
        isOpen: true,
        title: 'Weak Password',
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character.',
        type: 'error'
      });
      return false;
    }
    if(form.password !== form.confirmPassword) {
      setModal({
        isOpen: true,
        title: 'Password Mismatch',
        message: 'Passwords do not match. Please check and try again.',
        type: 'error'
      });
      return false;
    }
    if(!form.email || !form.email.includes('@')){
      setModal({
        isOpen: true,
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        type: 'error'
      });
      return false;
    }
    return true;
  };

  async function sendOtp(){
    if(!form.email) {
      setModal({
        isOpen: true,
        title: 'Email Required',
        message: 'Please enter your email address first.',
        type: 'error'
      });
      return;
    }
    setIsLoading(true);
    try{
      await axios.post(`${API}/auth/send-otp`, { email: form.email });
      setOtpSent(true);
      setModal({
        isOpen: true,
        title: 'OTP Sent',
        message: 'OTP sent successfully! Please check your email.',
        type: 'success'
      });
    }catch(err){
      setModal({
        isOpen: true,
        title: 'OTP Send Failed',
        message: err?.response?.data?.msg || 'Failed to send OTP. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyOtp(){
    setIsLoading(true);
    try{
      await axios.post(`${API}/auth/verify-otp`, { email: form.email, otp });
      setVerified(true);
      setModal({
        isOpen: true,
        title: 'Email Verified',
        message: 'Email verified successfully! You can now complete your registration.',
        type: 'success'
      });
    }catch(err){
      setModal({
        isOpen: true,
        title: 'Verification Failed',
        message: err?.response?.data?.msg || 'Invalid OTP. Please check and try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function submit(e){
    e.preventDefault();
    if(!validateLocal()) return;
    if(!verified){
      setModal({
        isOpen: true,
        title: 'Email Verification Required',
        message: 'Please verify your email with OTP first.',
        type: 'error'
      });
      return;
    }
    setIsLoading(true);
    try{
      await axios.post(`${API}/auth/register`, form);
      setModal({
        isOpen: true,
        title: 'Registration Successful',
        message: 'Welcome to our platform! Redirecting to login page...',
        type: 'success'
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }catch(err){
      setModal({
        isOpen: true,
        title: 'Registration Failed',
        message: err?.response?.data?.msg || 'Registration failed. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  const nextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!verified) {
        setModal({
          isOpen: true,
          title: 'Verification Required',
          message: 'Please verify your email with OTP before proceeding.',
          type: 'error'
        });
        return;
      }
      setCurrentStep(3);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep1 = () => {
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!form.fullName || !nameRegex.test(form.fullName)) {
      setModal({
        isOpen: true,
        title: 'Invalid Name',
        message: 'Please enter a valid name with only letters and spaces.',
        type: 'error'
      });
      return false;
    }
    if (!form.phone || !/^\d{10}$/.test(form.phone)) {
      setModal({
        isOpen: true,
        title: 'Invalid Phone',
        message: 'Phone number must be exactly 10 digits.',
        type: 'error'
      });
      return false;
    }
    if (!form.aadhar || !/^\d{12}$/.test(form.aadhar)) {
      setModal({
        isOpen: true,
        title: 'Invalid Aadhar',
        message: 'Aadhar number must be exactly 12 digits.',
        type: 'error'
      });
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create Your Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join our community to report crimes securely and help build a safer society
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Personal Info</span>
            </div>
            <div className={`w-12 h-0.5 mx-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Verification</span>
            </div>
            <div className={`w-12 h-0.5 mx-4 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 3 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Security</span>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
          <form onSubmit={submit} className="space-y-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                        placeholder="Enter your full name"
                        value={form.fullName}
                        onChange={e=>update('fullName',e.target.value)}
                      />
                    </div>
                    {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        pattern="[0-9]*"
                        inputMode="numeric"
                        className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                        placeholder="Enter 10-digit phone number"
                        value={form.phone}
                        onChange={e=>update('phone',e.target.value)}
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="aadhar" className="block text-sm font-medium text-gray-700 mb-2">
                      Aadhar Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <input
                        id="aadhar"
                        name="aadhar"
                        type="text"
                        required
                        pattern="[0-9]*"
                        inputMode="numeric"
                        className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                        placeholder="Enter 12-digit Aadhar number"
                        value={form.aadhar}
                        onChange={e=>update('aadhar',e.target.value)}
                      />
                    </div>
                    {errors.aadhar && <p className="text-red-500 text-sm mt-1">{errors.aadhar}</p>}
                  </div>

                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <select
                        id="gender"
                        name="gender"
                        className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                        value={form.gender}
                        onChange={e=>update('gender',e.target.value)}
                      >
                        <option value=''>Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <textarea
                      id="address"
                      name="address"
                      rows="3"
                      className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                      placeholder="Enter your complete address"
                      value={form.address}
                      onChange={e=>update('address',e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10a2 2 0 002 2h4a2 2 0 002-2V11M9 11h6" />
                      </svg>
                    </div>
                    <input
                      id="dob"
                      name="dob"
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                      value={form.dob}
                      onChange={e=>update('dob',e.target.value)}
                    />
                  </div>
                  {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Email Verification */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                        placeholder="Enter your email address"
                        value={form.email}
                        onChange={e=>update('email',e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={isLoading || otpSent}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 whitespace-nowrap"
                    >
                      {otpSent ? 'OTP Sent' : 'Send OTP'}
                    </button>
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                {otpSent && !verified && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                      Enter OTP *
                    </label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          required
                          className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={e=>setOtp(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={verifyOtp}
                        disabled={isLoading || verified}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 whitespace-nowrap"
                      >
                        {verified ? 'Verified' : 'Verify OTP'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Security */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                      placeholder="Create a strong password"
                      value={form.password}
                      onChange={e=>update('password',e.target.value)}
                    />
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                      placeholder="Confirm your password"
                      value={form.confirmPassword}
                      onChange={e=>update('confirmPassword',e.target.value)}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Previous
                </button>
              )}
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ml-auto"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ml-auto"
                >
                  {isLoading ? 'Registering...' : 'Register'}
                </button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="text-center mt-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-red-800">Emergency</span>
            </div>
            <p className="text-sm text-red-700">
              Need immediate help? Call{' '}
              <a href="tel:100" className="font-semibold hover:underline">
                100
              </a>
            </p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
}
