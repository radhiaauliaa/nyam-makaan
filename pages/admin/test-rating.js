// pages/admin/test-rating.js
import { useState } from 'react';
import { updateRestaurantRating } from '../../lib/firestore';
import Layout from '../../components/Layout/Layout';

export default function TestRatingPage() {
  const [restaurantId, setRestaurantId] = useState('Rok5jYDdq15Ma7CNelOj');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const testRatingUpdate = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.clear();
      console.log('🧪 Testing rating update...');
      
      const startTime = Date.now();
      const result = await updateRestaurantRating(restaurantId);
      const endTime = Date.now();
      
      setResult({
        ...result,
        executionTime: endTime - startTime
      });
      
      alert(`✅ Test completed in ${endTime - startTime}ms\nCheck browser console for details`);
      
    } catch (error) {
      console.error('Test error:', error);
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Test Rating Update</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant ID
              </label>
              <input
                type="text"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <button
              onClick={testRatingUpdate}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Rating Update'}
            </button>
            
            <p className="mt-4 text-sm text-gray-600">
              Buka <strong>Developer Console (F12)</strong> untuk melihat log detail
            </p>
          </div>
          
          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold mb-2">Test Result</h3>
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}