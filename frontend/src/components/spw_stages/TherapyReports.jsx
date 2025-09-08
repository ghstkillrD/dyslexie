import { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export default function TherapyReports({ student_id }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    // Get user role from token
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setUserRole(decoded.role);
    }
    
    fetchTherapyReports();
  }, [student_id]);

  const fetchTherapyReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/therapy-reports/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching therapy reports:', error);
      setError('Failed to load therapy reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedReport = async (sessionNumber) => {
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/therapy-reports/${sessionNumber}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDetailedReport(response.data);
    } catch (error) {
      console.error('Error fetching detailed report:', error);
      alert('Error loading detailed report');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReportClick = (report) => {
    setSelectedReport(report);
    fetchDetailedReport(report.session_number);
  };

  const closeDetailView = () => {
    setSelectedReport(null);
    setDetailedReport(null);
  };

  const getOutcomeColor = (outcome) => {
    const colors = {
      'ongoing': 'bg-blue-100 text-blue-800',
      'terminated': 'bg-green-100 text-green-800',
      'continued': 'bg-orange-100 text-orange-800'
    };
    return colors[outcome] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className="p-4">Loading therapy reports...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Reports</h3>
          <p className="text-red-700 mb-3">{error}</p>
          <button 
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchTherapyReports();
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Therapy Reports</h3>
          <p className="text-gray-700">
            No therapy session reports have been generated yet. Reports are created when therapy sessions are completed or restarted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold mb-4">Therapy Session Reports</h3>
      
      {!selectedReport ? (
        // Reports list view
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-blue-700 text-sm">
              <strong>Reports Archive:</strong> This section contains historical records of all therapy sessions. 
              Each report preserves the complete data from Stages 5, 6, and 7 for that session.
            </p>
          </div>

          <div className="grid gap-4">
            {reports.map((report) => (
              <div 
                key={report.session_number}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleReportClick(report)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-lg">Session {report.session_number}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(report.session_outcome)}`}>
                    {report.session_outcome.charAt(0).toUpperCase() + report.session_outcome.slice(1)}
                  </span>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Start Date:</span> {formatDate(report.session_start_date)}
                  </div>
                  <div>
                    <span className="font-medium">End Date:</span> {formatDate(report.session_end_date)}
                  </div>
                  
                  {userRole !== 'doctor' && (
                    <>
                      <div>
                        <span className="font-medium">Total Activities:</span> {report.total_activities || 0}
                      </div>
                      <div>
                        <span className="font-medium">Progress Records:</span> {report.progress_records || 0}
                      </div>
                      {report.diagnosis && (
                        <div className="md:col-span-2">
                          <span className="font-medium">Diagnosis:</span> {report.diagnosis.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <div className="mt-3 text-blue-600 text-sm">
                  Click to view detailed report →
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Detailed report view
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">
              Session {selectedReport.session_number} - Detailed Report
            </h4>
            <button
              onClick={closeDetailView}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              ← Back to Reports
            </button>
          </div>

          {loadingDetail ? (
            <div className="p-4">Loading detailed report...</div>
          ) : detailedReport ? (
            <div className="space-y-6">
              {/* Session Overview */}
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-semibold mb-3">Session Overview</h5>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Session Number:</span> {detailedReport.session_number}
                  </div>
                  <div>
                    <span className="font-medium">Start Date:</span> {formatDate(detailedReport.session_start_date)}
                  </div>
                  <div>
                    <span className="font-medium">End Date:</span> {formatDate(detailedReport.session_end_date)}
                  </div>
                  <div className="md:col-span-3">
                    <span className="font-medium">Outcome:</span>{' '}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(detailedReport.session_outcome)}`}>
                      {detailedReport.session_outcome.charAt(0).toUpperCase() + detailedReport.session_outcome.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evaluation Summary */}
              {detailedReport.evaluation_summary && (
                <div className="bg-white border rounded-lg p-4">
                  <h5 className="font-semibold mb-3">Evaluation Summary</h5>
                  <div className="space-y-3">
                    {detailedReport.evaluation_summary.diagnosis && (
                      <div>
                        <span className="font-medium">Diagnosis:</span> {detailedReport.evaluation_summary.diagnosis.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    )}
                    {detailedReport.evaluation_summary.intervention_priority && (
                      <div>
                        <span className="font-medium">Priority:</span> {detailedReport.evaluation_summary.intervention_priority.charAt(0).toUpperCase() + detailedReport.evaluation_summary.intervention_priority.slice(1)}
                      </div>
                    )}
                    {detailedReport.evaluation_summary.short_term_goals && (
                      <div>
                        <span className="font-medium">Short-term Goals:</span>
                        <p className="mt-1 text-gray-700">{detailedReport.evaluation_summary.short_term_goals}</p>
                      </div>
                    )}
                    {detailedReport.evaluation_summary.long_term_goals && (
                      <div>
                        <span className="font-medium">Long-term Goals:</span>
                        <p className="mt-1 text-gray-700">{detailedReport.evaluation_summary.long_term_goals}</p>
                      </div>
                    )}
                    {detailedReport.evaluation_summary.recommendations && (
                      <div>
                        <span className="font-medium">Recommendations for {userRole}:</span>
                        <p className="mt-1 text-gray-700">{detailedReport.evaluation_summary.recommendations}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activities Summary */}
              {detailedReport.activities_summary && (
                <div className="bg-white border rounded-lg p-4">
                  <h5 className="font-semibold mb-3">Activities Summary</h5>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Activities:</span> {detailedReport.activities_summary.total_activities}
                    </div>
                    <div>
                      <span className="font-medium">Progress Records:</span> {detailedReport.activities_summary.progress_records}
                    </div>
                    <div>
                      <span className="font-medium">Activity Types:</span> {detailedReport.activities_summary.activity_types.join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Doctor-only detailed data */}
              {userRole === 'doctor' && detailedReport.activity_assignments && (
                <div className="space-y-4">
                  {/* Activity Assignments */}
                  <div className="bg-white border rounded-lg p-4">
                    <h5 className="font-semibold mb-3">Stage 5: Activity Assignments</h5>
                    {detailedReport.activity_assignments.length > 0 ? (
                      <div className="space-y-2">
                        {detailedReport.activity_assignments.map((activity, index) => (
                          <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                            <div className="font-medium">{activity.activity_name}</div>
                            <div className="text-sm text-gray-600">
                              Type: {activity.activity_type} | Difficulty: {activity.difficulty_level} | Duration: {activity.estimated_duration} mins
                            </div>
                            <div className="text-sm text-gray-700 mt-1">{activity.description}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No activity assignments recorded</p>
                    )}
                  </div>

                  {/* Activity Progress */}
                  <div className="bg-white border rounded-lg p-4">
                    <h5 className="font-semibold mb-3">Stage 6: Activity Progress</h5>
                    {detailedReport.activity_progress && detailedReport.activity_progress.length > 0 ? (
                      <div className="space-y-2">
                        {detailedReport.activity_progress.map((progress, index) => (
                          <div key={index} className="border-l-4 border-green-200 pl-4 py-2">
                            <div className="font-medium">{progress.activity_name}</div>
                            <div className="text-sm text-gray-600">
                              Date: {formatDate(progress.session_date)} | Performer: {progress.performer} | Score: {progress.performance_score}/10 | Status: {progress.completion_status}
                            </div>
                            {progress.observations && (
                              <div className="text-sm text-gray-700 mt-1">Observations: {progress.observations}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No progress records found</p>
                    )}
                  </div>

                  {/* Final Evaluation */}
                  {detailedReport.final_evaluation && Object.keys(detailedReport.final_evaluation).length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <h5 className="font-semibold mb-3">Stage 7: Final Evaluation</h5>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium">Diagnosis:</span> {detailedReport.final_evaluation.final_diagnosis?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div>
                          <span className="font-medium">Confidence:</span> {detailedReport.final_evaluation.diagnosis_confidence}/10
                        </div>
                        <div>
                          <span className="font-medium">Therapy Decision:</span> {detailedReport.final_evaluation.therapy_decision}
                        </div>
                        {detailedReport.final_evaluation.therapy_termination_reason && (
                          <div>
                            <span className="font-medium">Termination Reason:</span> {detailedReport.final_evaluation.therapy_termination_reason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">Error loading detailed report</div>
          )}
        </div>
      )}
    </div>
  );
}
