import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Stage1({ student_id, canEdit, isCompleted, onComplete }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [tempResult, setTempResult] = useState(null);
  const [savedSample, setSavedSample] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [error, setError] = useState('');

  // Helper function to parse letter counts safely
  const parseLetterCounts = (letterCounts) => {
    if (!letterCounts) return { Normal: 0, Corrected: 0, Reversal: 0 };
    
    // If it's already an object, return it
    if (typeof letterCounts === 'object' && !Array.isArray(letterCounts)) {
      return {
        Normal: letterCounts.Normal || 0,
        Corrected: letterCounts.Corrected || 0,
        Reversal: letterCounts.Reversal || 0
      };
    }
    
    // If it's a string, try to parse it
    if (typeof letterCounts === 'string') {
      try {
        const parsed = JSON.parse(letterCounts);
        return {
          Normal: parsed.Normal || 0,
          Corrected: parsed.Corrected || 0,
          Reversal: parsed.Reversal || 0
        };
      } catch (error) {
        console.error('Error parsing letter_counts:', error);
        return { Normal: 0, Corrected: 0, Reversal: 0 };
      }
    }
    
    // Fallback
    return { Normal: 0, Corrected: 0, Reversal: 0 };
  };

  // Load existing handwriting samples when component mounts
  useEffect(() => {
    loadExistingHandwritingSamples();
  }, [student_id]);

  const loadExistingHandwritingSamples = async () => {
    try {
      setLoadingExisting(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://127.0.0.1:8000/api/users/students/${student_id}/get_handwriting_samples/`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data && response.data.length > 0) {
        // Get the most recent sample
        const latestSample = response.data[response.data.length - 1];
        setSavedSample(latestSample);
        // Set the result to show existing data
        setTempResult({
          dyslexia_score: latestSample.dyslexia_score,
          interpretation: latestSample.interpretation,
          letter_counts: latestSample.letter_counts
        });
      }
    } catch (err) {
      console.error('Error loading existing handwriting samples:', err);
      setError('Failed to load existing handwriting analysis');
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      // Clear any previous results when new image is selected
      setTempResult(null);
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', image);
    formData.append('temp_analysis', 'true'); // Flag for temporary analysis

    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/analyze-handwriting/`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`, 
            'Content-Type': 'multipart/form-data' 
          }
        }
      );
      
      setTempResult(response.data);
    } catch (err) {
      console.error('Error analyzing handwriting:', err);
      setError(err.response?.data?.error || 'Failed to analyze handwriting');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the current analysis? This will remove the uploaded image and prediction results.')) {
      setImage(null);
      setImagePreview(null);
      setTempResult(null);
      setSavedSample(null);
      setError('');
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleNext = async () => {
    if (!tempResult) {
      setError('Please analyze an image before proceeding to the next stage');
      return;
    }

    if (!image && !savedSample) {
      setError('No image data available to save');
      return;
    }

    setNextLoading(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      // If we have a new image and temp result, save it first
      if (image && tempResult && !savedSample) {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('dyslexia_score', tempResult.dyslexia_score);
        formData.append('interpretation', tempResult.interpretation);
        formData.append('letter_counts', JSON.stringify(tempResult.letter_counts));

        await axios.post(
          `http://127.0.0.1:8000/api/users/students/${student_id}/save_handwriting_sample/`,
          formData,
          { 
            headers: { 
              Authorization: `Bearer ${token}`, 
              'Content-Type': 'multipart/form-data' 
            }
          }
        );
      }

      // Complete the stage
      const response = await axios.post(
        `http://127.0.0.1:8000/api/users/students/${student_id}/complete_stage/`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      onComplete(response.data);
    } catch (err) {
      console.error('Error completing stage:', err);
      setError(err.response?.data?.error || 'Failed to save data and complete stage');
    } finally {
      setNextLoading(false);
    }
  };

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <div className="mt-4">
      {loadingExisting ? (
        <div className="text-center py-4">
          <div className="text-gray-600">Loading existing handwriting analysis...</div>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Image Upload Section */}
          <div className="mb-4">
            <label className="block font-medium mb-2">Upload Handwriting Sample:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={!canEdit || isCompleted}
              className={`w-full border border-gray-300 rounded px-3 py-2 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
                isCompleted ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
              }`}
            />
            {!canEdit && !isCompleted && (
              <p className="text-yellow-600 text-sm mt-1">You don't have permission to upload images</p>
            )}
            {isCompleted && (
              <p className="text-green-600 text-sm mt-1">✓ Stage 1 completed - Upload is no longer available</p>
            )}
          </div>

          {/* Image Preview - only show if not completed and have current image */}
          {imagePreview && !isCompleted && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Image Preview:</h4>
              <div className="border rounded-lg p-2 bg-gray-50">
                <img 
                  src={imagePreview} 
                  alt="Handwriting sample preview" 
                  className="max-w-full max-h-64 object-contain mx-auto"
                />
              </div>
            </div>
          )}

          {/* Existing Sample Display - show if completed OR if we have savedSample and no current image */}
          {savedSample && (isCompleted || !image) && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">
                {isCompleted ? 'Saved Handwriting Sample:' : 'Existing Handwriting Sample:'}
              </h4>
              <div className="border rounded-lg p-2 bg-gray-50">
                <img 
                  src={savedSample.image} 
                  alt="Existing handwriting sample" 
                  className="max-w-full max-h-64 object-contain mx-auto"
                />
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Uploaded on: {new Date(savedSample.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={handleAnalyze}
              disabled={!image || loading || !canEdit || isCompleted}
              className={`px-6 py-2 rounded flex items-center gap-2 ${
                isCompleted 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                  : !image || loading || !canEdit 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyzing...
                </>
              ) : (
                'Analyze Handwriting'
              )}
            </button>
            
            <button
              onClick={handleClear}
              disabled={loading || !canEdit || isCompleted}
              className={`px-4 py-2 rounded ${
                isCompleted 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                  : loading || !canEdit 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              Clear
            </button>
            
            <button
              onClick={handleNext}
              disabled={!tempResult || nextLoading || !canEdit || isCompleted}
              className={`px-6 py-2 rounded flex items-center gap-2 ${
                isCompleted 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                  : !tempResult || nextLoading || !canEdit 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {nextLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                'Complete Stage 1'
              )}
            </button>
          </div>

          {/* Analysis Results */}
          {tempResult && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-green-700">
                📊 Handwriting Analysis Results
              </h4>
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Dyslexia Score:</span>
                    <div className="text-lg font-semibold text-blue-600">
                      {tempResult.dyslexia_score}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Interpretation:</span>
                    <div className="text-lg font-medium text-gray-800">
                      {tempResult.interpretation}
                    </div>
                  </div>
                </div>
                
                {tempResult.letter_counts && (
                  <div>
                    <span className="font-medium text-gray-700 block mb-3">Letter Analysis:</span>
                    {(() => {
                      const letterCounts = parseLetterCounts(tempResult.letter_counts);
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {letterCounts.Normal}
                              </div>
                              <div className="text-sm font-medium text-gray-700">Normal</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {letterCounts.Corrected}
                              </div>
                              <div className="text-sm font-medium text-gray-700">Corrected</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-600">
                                {letterCounts.Reversal}
                              </div>
                              <div className="text-sm font-medium text-gray-700">Reversal</div>
                            </div>
                          </div>
                          
                          {/* Alternative horizontal layout for smaller screens */}
                          <div className="mt-3 p-3 bg-gray-50 rounded text-center text-sm font-medium text-gray-700 md:hidden">
                            Normal: <span className="text-green-600 font-bold">{letterCounts.Normal}</span> | 
                            Corrected: <span className="text-blue-600 font-bold">{letterCounts.Corrected}</span> | 
                            Reversal: <span className="text-red-600 font-bold">{letterCounts.Reversal}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {tempResult.temp_analysis && !savedSample && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-yellow-700 text-sm">
                      ⚠️ This is a temporary analysis. Click "Complete Stage 1" to save the results permanently.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stage Completion Status */}
          {isCompleted && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              ✓ Stage 1 has been completed. Handwriting analysis has been saved successfully.
            </div>
          )}

          {/* Instructions */}
          {!tempResult && !savedSample && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <h5 className="font-medium text-blue-800 mb-2">Instructions:</h5>
              <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                <li>Upload a clear image of the student's handwriting sample</li>
                <li>Click "Analyze Handwriting" to get AI-powered dyslexia assessment</li>
                <li>Review the analysis results</li>
                <li>Click "Complete Stage 1" to save and proceed to the next stage</li>
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}
