
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Shield,
  Zap,
  PhoneCall,
  LogIn,
  UserPlus,
  ArrowRight,
  Home,
  LayoutDashboard,
  Menu,
  X,
  FileText,
  CheckCheck,
  Users,
  Clock,
  Send,
} from 'lucide-react';
import logo from './logo.png';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import UserDashboard from './pages/UserDashboard';

// --- LLM API Configuration and Utilities ---
const LLM_MODEL = 'gemini-2.5-flash-preview-09-2025';
const API_KEY = ""; // Use empty string for Canvas
const API_URL_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${API_KEY}`;

// Helper for exponential backoff
const delay = ms => new Promise(res => setTimeout(res, ms));

// Core function to call the Gemini API
const generateTextWithGemini = async (userQuery, systemPrompt = null, maxRetries = 3) => {
    let responseText = "Error: Could not process request after multiple attempts.";
    
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        // Using Google Search grounding for potentially factual analysis (like confirming common crime definitions)
        tools: [{ "google_search": {} }], 
    };

    if (systemPrompt) {
        payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(API_URL_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429 && i < maxRetries - 1) {
                await delay(Math.pow(2, i) * 1000); // Exponential backoff
                continue;
            }

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();
            const candidate = result.candidates?.[0];

            if (candidate && candidate.content?.parts?.[0]?.text) {
                return { text: candidate.content.parts[0].text };
            }
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
        }
    }
    return { text: responseText };
};



// -------------------
// NavBar Component
// -------------------
function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [location]);

  const NavLink = ({ to, children }) => (
    <Link
      to={to}
      className={`text-sm font-semibold transition duration-150 p-2 rounded-lg flex items-center ${
        location.pathname === to
          ? 'text-white bg-indigo-700'
          : 'text-gray-200 hover:text-white hover:bg-indigo-700'
      }`}
    >
      {children}
    </Link>
  );

  const isHomePage = location.pathname === '/';

  return (
    <nav className="bg-[#1A2346] shadow-2xl sticky top-0 z-50 font-['Inter']">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">

        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
          <div className="flex flex-col leading-snug">
            <Link to="/" className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Digital Crime Reporting Portal
            </Link>

          </div>
        </div>

        {/* Desktop Links and Auth Buttons */}
        <div className="hidden md:flex items-center space-x-6">
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.href = 'tel:100'}
              className="flex items-center px-4 py-2 text-sm font-medium rounded-full text-white bg-red-600 hover:bg-red-700 transition duration-150 shadow-md"
            >
              <PhoneCall className="w-4 h-4 mr-2" /> Emergency
            </button>
            {isHomePage && !isLoggedIn && (
              <>
                <Link
                  to="/login"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-full text-indigo-200 border border-indigo-400 hover:bg-indigo-700 hover:text-white transition duration-150 shadow-md"
                >
                  <LogIn className="w-4 h-4 mr-2" /> Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition duration-150 shadow-lg"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-white p-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#253567] pb-4">
          <div className="flex flex-col space-y-2 px-4">
            {isHomePage && !isLoggedIn && (
              <>
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/register">Register</NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// -------------------
// HomePage Component
// -------------------
const HomePage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

    const MetricCard = ({ icon: Icon, value, label, color }) => (
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-xl border-t-4" style={{ borderColor: color }}>
            <Icon className="w-12 h-12 mb-3" style={{ color: color }} />
            <p className="text-4xl sm:text-5xl font-extrabold text-gray-900">{value}</p>
            <p className="mt-1 text-lg font-medium text-gray-600 text-center">{label}</p>
        </div>
    );

    const StepCard = ({ number, title, description, icon: Icon }) => (
        <div className="p-8 bg-white rounded-xl shadow-xl border-t-4 border-indigo-500 relative pt-12">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {number}
            </div>
            <Icon className="w-10 h-10 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">{title}</h3>
            <p className="text-gray-600 text-center">{description}</p>
        </div>
    );


    return (
        <div className="min-h-screen bg-gray-50 font-['Inter']">
            <script src="https://cdn.tailwindcss.com"></script>

            {/* Hero Section */}
            <div
              className="relative bg-cover bg-center text-white py-24 sm:py-32"
              style={{
                // Using a simple placeholder URL for robust loading in the environment
                backgroundImage: `url('https://assets.everspringpartners.com/dims4/default/b86f6fb/2147483647/strip/true/crop/1230x646+370+0/resize/1200x630!/quality/90/?url=http%3A%2F%2Feverspring-brightspot.s3.us-east-1.amazonaws.com%2F6b%2F19%2F381453434f2faa5162059a38f66f%2Fpitt-intro-criminal-law.jpg')`,
                backgroundAttachment: 'fixed'
              }}
            >
              <div className="absolute inset-0 bg-[#1A2346] bg-opacity-70"></div>
              <div className="relative container mx-auto px-8 text-center max-w-5xl">
                <h1 className="text-4xl sm:text-6xl font-extrabold mb-6 leading-tight tracking-tighter">
                  Empowering Citizens Through <span className="text-red-400">Digital Justice</span>
                </h1>
                <p className="max-w-3xl mx-auto text-xl text-gray-200">
                  The Digital Crime Reporting Portal enables every citizen to report crimes securely and efficiently,
                  ensuring transparency, accountability, and quick response by law enforcement.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center bg-white hover:bg-gray-100 text-indigo-600 font-bold text-lg px-8 py-4 rounded-xl shadow-2xl transition duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <LogIn className="mr-3 w-5 h-5" /> Login
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-2xl transition duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Register & Report Crime <ArrowRight className="ml-3 w-5 h-5" />
                  </Link>
                </div>
                <p className="mt-4 text-sm text-gray-300">
                    *Authentication is mandatory for all reporting and status tracking features.
                </p>
              </div>
            </div>

            {/* Impact & Metrics Section */}
            <div className="bg-white py-16 sm:py-20 border-b border-gray-100">
                <div className="container mx-auto px-8">
                    <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-12">
                        Our Impact: Security Through Numbers
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <MetricCard icon={Users} value="250K+" label="Registered Users" color="#059669" /> {/* Green */}
                        <MetricCard icon={FileText} value="45K" label="Reports Filed Annually" color="#3b82f6" /> {/* Blue */}
                        <MetricCard icon={Clock} value="48h Avg" label="Initial Triage Time" color="#f59e0b" /> {/* Yellow */}
                    </div>
                </div>
            </div>

            {/* Features Section (Re-styled) */}
            <div className="container mx-auto px-8 py-20 sm:py-28">
              <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-16">
                Key Pillars of Our Digital Platform
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                
                {/* Feature 1: Secure Reporting */}
                <div className="bg-white border-b-4 border-blue-600 shadow-xl rounded-xl p-8 hover:shadow-2xl transition duration-300 transform hover:-translate-y-1">
                  <Shield className="w-12 h-12 text-blue-600 mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Encrypted & Secure
                  </h3>
                  <p className="text-gray-600">
                    Your sensitive data is protected by government-grade encryption protocols. Report crimes with confidence, knowing your privacy is paramount.
                  </p>
                </div>
                
                {/* Feature 2: Quick Processing */}
                <div className="bg-white border-b-4 border-green-600 shadow-xl rounded-xl p-8 hover:shadow-2xl transition duration-300 transform hover:-translate-y-1">
                  <Zap className="w-12 h-12 text-green-600 mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Rapid Triage & Tracking
                  </h3>
                  <p className="text-gray-600">
                    Reports are instantly routed and categorized by local authorities. Track your case status in real-time within your authenticated dashboard.
                  </p>
                </div>
                
                {/* Feature 3: Support */}
                <div className="bg-white border-b-4 border-red-600 shadow-xl rounded-xl p-8 hover:shadow-2xl transition duration-300 transform hover:-translate-y-1">
                  <PhoneCall className="w-12 h-12 text-red-600 mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Critical Support Access
                  </h3>
                  <p className="text-gray-600">
                    Direct access to official emergency helplines and specialized support services for critical and non-critical advice, available 24/7.
                  </p>
                </div>
              </div>
            </div>

            {/* How It Works Section - New Content */}
            <div className="bg-gray-100 py-20 sm:py-28">
                <div className="container mx-auto px-8">
                    <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-16">
                        The Digital Crime Reporting Workflow
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <StepCard
                            number={1}
                            icon={LogIn}
                            title="Authenticate Your Identity"
                            description="Log in or complete the secure one-time registration process. All reports must be filed by a verifiable user."
                        />
                        <StepCard
                            number={2}
                            icon={FileText}
                            title="File the Detailed Report"
                            description="Provide all incident details, including location, time, and upload any supporting evidence like images or documents."
                        />
                        <StepCard
                            number={3}
                            icon={CheckCheck}
                            title="Track Official Response"
                            description="Receive a unique tracking ID immediately. Use your dashboard to monitor processing status and view official communication."
                        />
                    </div>
                </div>
            </div>

            {/* Call to Action Section */}
            <div className="bg-gradient-to-r from-indigo-800 to-blue-900 text-white py-20">
              <div className="container mx-auto px-8 text-center">
                <h2 className="text-4xl font-extrabold mb-4">
                  Ready to Contribute to a Safer Society?
                </h2>
                <p className="text-xl mb-10 opacity-90 max-w-3xl mx-auto">
                  Your report is a vital step in crime prevention. Begin your secure registration process today.
                </p>
                <Link
                  to="/register"
                  className="bg-indigo-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-indigo-700 transition duration-300 shadow-2xl transform hover:scale-105"
                >
                  Start Registration
                </Link>
              </div>
            </div>
        </div>
    );
};


// -------------------
// Main App Component
// -------------------
export default function App() {
  // Load Tailwind CSS script once at the very beginning
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-grow"> {/* Added main tag and flex-grow for layout integrity */}
            <Routes>
              {/* ---------------- HOME PAGE ---------------- */}
              <Route path="/" element={<HomePage />} />

              {/* ---------------- OTHER ROUTES ---------------- */}
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/officer" element={<OfficerDashboard />} />
              <Route path="/user" element={<UserDashboard />} />
            </Routes>
        </main>
        
        {/* Footer component for completeness */}
        <footer className="bg-gray-800 text-white mt-auto">
            <div className="container mx-auto px-8 py-10 text-center">
                <p className="text-sm text-gray-400">© 2025 Digital Crime Reporting Portal. All rights reserved.</p>
                <p className="text-xs text-gray-500 mt-1">Disclaimer: This portal is for non-emergency crime reporting only. Always call 100 for immediate threats.</p>
            </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
