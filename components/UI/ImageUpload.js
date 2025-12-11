import { useState } from 'react';
import { uploadImage } from '../../lib/cloudinary';

export default function ImageUpload({ onImageUpload, currentImage, label = "Upload Image" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const result = await uploadImage(file);
      
      if (result.success) {
        onImageUpload(result.url);
        setError('');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Gagal mengupload gambar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      {currentImage ? (
        <div className="space-y-2">
          <img 
            src={currentImage} 
            alt="Preview" 
            className="w-full h-48 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={() => document.getElementById('image-upload').click()}
            disabled={uploading}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            Ganti Foto
          </button>
        </div>
      ) : (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer"
          onClick={() => document.getElementById('image-upload').click()}
        >
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            Klik untuk upload gambar
          </p>
          <p className="text-xs text-gray-500 mt-1">
            JPEG, PNG, WebP, GIF (maks. 5MB)
          </p>
        </div>
      )}

      <input
        id="image-upload"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {uploading && (
        <div className="flex items-center space-x-2 text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Mengupload gambar...</span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}