export const uploadImage = async (file) => {
  // Validasi file sebelum upload
  if (!file) {
    return {
      success: false,
      error: 'Tidak ada file yang dipilih'
    };
  }

  // Validasi tipe file
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: 'Hanya file JPEG, PNG, WebP, dan GIF yang diizinkan'
    };
  }

  // Validasi ukuran file (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      success: false,
      error: 'Ukuran file maksimal 5MB'
    };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'nyammakan_unsigned'); // Hardcoded untuk testing

  try {
    console.log('Starting upload to Cloudinary...', {
      cloudName: 'docguddbw',
      uploadPreset: 'nyammakan_unsigned',
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/docguddbw/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    console.log('Cloudinary response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      let errorMessage = 'Upload failed';
      if (response.status === 400) {
        errorMessage = 'Format gambar tidak valid';
      } else if (response.status === 413) {
        errorMessage = 'Ukuran gambar terlalu besar';
      } else if (response.status === 401) {
        errorMessage = 'Konfigurasi Cloudinary salah';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    
    return {
      success: true,
      url: data.secure_url,
      public_id: data.public_id
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: error.message || 'Gagal mengupload gambar'
    };
  }
};