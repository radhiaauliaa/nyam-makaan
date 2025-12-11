import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateReviewReply } from '../../lib/firestore';

export default function ReplyForm({ review, onReplyAdded }) {
  const { currentUser } = useAuth();
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reply.trim()) {
      alert('Balasan tidak boleh kosong');
      return;
    }

    setLoading(true);
    try {
      const result = await updateReviewReply(review.id, reply, currentUser.uid);
      if (result.success) {
        setReply('');
        setIsReplying(false);
        if (onReplyAdded) onReplyAdded();
        alert('Balasan berhasil dikirim!');
      } else {
        alert('Gagal mengirim balasan: ' + result.error);
      }
    } catch (error) {
      console.error('Error replying to review:', error);
      alert('Terjadi kesalahan saat mengirim balasan');
    } finally {
      setLoading(false);
    }
  };

  if (!isReplying) {
    return (
      <button
        onClick={() => setIsReplying(true)}
        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm"
      >
        Balas Ulasan
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        rows="3"
        placeholder="Tulis balasan Anda..."
        required
      />
      <div className="flex space-x-2 mt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? 'Mengirim...' : 'Kirim Balasan'}
        </button>
        <button
          type="button"
          onClick={() => setIsReplying(false)}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
        >
          Batal
        </button>
      </div>
    </form>
  );
}