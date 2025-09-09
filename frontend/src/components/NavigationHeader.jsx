import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function NavigationHeader({ 
  title, 
  subtitle, 
  userRole, 
  onLogout,
  gradientFrom = 'blue-50',
  gradientVia = 'white', 
  gradientTo = 'indigo-50',
  profileButtonColor = 'blue'
}) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsScrolled(scrollTop > 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getProfileButtonColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-700 bg-blue-100 hover:bg-blue-200',
      emerald: 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200',
      purple: 'text-purple-700 bg-purple-100 hover:bg-purple-200'
    }
    return colors[color] || colors.blue
  }

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'teacher': return 'Teacher'
      case 'doctor': return 'Medical Professional'
      case 'parent': return 'Parent/Guardian'
      default: return role
    }
  }

  return (
    <>
      {/* Navigation Header */}
      <div className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out
        ${isScrolled 
          ? 'bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50' 
          : 'bg-white shadow-sm border-b border-gray-200'
        }
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Left side - Title and subtitle */}
            <div className={`transition-all duration-500 ease-in-out ${isScrolled ? 'transform scale-90' : ''}`}>
              <h1 className={`font-bold text-gray-900 transition-all duration-300 ${isScrolled ? 'text-2xl' : 'text-3xl'}`}>
                {title}
              </h1>
              <p className={`text-gray-600 transition-all duration-300 ${isScrolled ? 'text-sm mt-0' : 'mt-1'}`}>
                {subtitle}
              </p>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Role Badge */}
              <div className={`
                px-3 py-1.5 bg-gradient-to-r text-white rounded-lg text-sm font-medium transition-all duration-300
                ${userRole === 'teacher' ? 'from-blue-500 to-blue-600' : 
                  userRole === 'doctor' ? 'from-emerald-500 to-emerald-600' : 
                  'from-purple-500 to-purple-600'}
                ${isScrolled ? 'scale-90' : ''}
              `}>
                {getRoleDisplayName(userRole)}
              </div>

              {/* Dashboard Button */}
              <button
                onClick={() => {
                  const dashboardUrl = userRole === 'teacher' ? '/teacher/students' : 
                                    userRole === 'doctor' ? '/doctor/students' : 
                                    '/parent/students'
                  navigate(dashboardUrl)
                }}
                className={`
                  inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg 
                  transition-all duration-200 text-gray-700 bg-gray-100 hover:bg-gray-200
                  ${isScrolled ? 'scale-90' : ''}
                `}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </button>

              {/* Classrooms Button - Only for teachers */}
              {userRole === 'teacher' && (
                <button
                  onClick={() => navigate('/classrooms')}
                  className={`
                    inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg 
                    transition-all duration-200 text-indigo-700 bg-indigo-100 hover:bg-indigo-200
                    ${isScrolled ? 'scale-90' : ''}
                  `}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h4" />
                  </svg>
                  Classrooms
                </button>
              )}

              {/* Profile Button */}
              <button
                onClick={() => navigate('/profile')}
                className={`
                  inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg 
                  transition-all duration-200 ${getProfileButtonColorClasses(profileButtonColor)}
                  ${isScrolled ? 'scale-90' : ''}
                `}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className={`
                  inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg 
                  text-red-700 bg-red-100 hover:bg-red-200 transition-all duration-200
                  ${isScrolled ? 'scale-90' : ''}
                `}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`
                  inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-gray-900 
                  hover:bg-gray-100 transition-all duration-200
                  ${isScrolled ? 'scale-90' : ''}
                `}
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {/* Hamburger icon */}
                <svg 
                  className={`w-6 h-6 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className={`
            md:hidden transition-all duration-300 ease-in-out overflow-hidden
            ${isMobileMenuOpen ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0'}
          `}>
            <div className="border-t border-gray-200 pt-4 space-y-3">
              {/* Role Badge - Mobile */}
              <div className="flex justify-center">
                <div className={`
                  px-4 py-2 bg-gradient-to-r text-white rounded-lg text-sm font-medium
                  ${userRole === 'teacher' ? 'from-blue-500 to-blue-600' : 
                    userRole === 'doctor' ? 'from-emerald-500 to-emerald-600' : 
                    'from-purple-500 to-purple-600'}
                `}>
                  {getRoleDisplayName(userRole)}
                </div>
              </div>

              {/* Dashboard Button - Mobile */}
              <button
                onClick={() => {
                  const dashboardUrl = userRole === 'teacher' ? '/teacher/students' : 
                                    userRole === 'doctor' ? '/doctor/students' : 
                                    '/parent/students'
                  navigate(dashboardUrl)
                  setIsMobileMenuOpen(false)
                }}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </button>

              {/* Classrooms Button - Mobile - Only for teachers */}
              {userRole === 'teacher' && (
                <button
                  onClick={() => {
                    navigate('/classrooms')
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h4" />
                  </svg>
                  My Classrooms
                </button>
              )}

              {/* Profile Button - Mobile */}
              <button
                onClick={() => {
                  navigate('/profile')
                  setIsMobileMenuOpen(false)
                }}
                className={`
                  w-full inline-flex items-center justify-center px-4 py-3 border border-transparent 
                  text-base font-medium rounded-lg transition-colors duration-200
                  ${getProfileButtonColorClasses(profileButtonColor)}
                `}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile Settings
              </button>

              {/* Logout Button - Mobile */}
              <button
                onClick={() => {
                  onLogout()
                  setIsMobileMenuOpen(false)
                }}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden under fixed header */}
      <div className={`transition-all duration-300 ${isScrolled ? 'h-20' : 'h-24'}`}></div>
    </>
  )
}
