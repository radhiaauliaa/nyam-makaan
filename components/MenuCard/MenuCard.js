// components/MenuCard/MenuCard.js
import { useState, useEffect } from 'react';
import { getActivePromosForMenu } from '../../lib/firestore';

export default function MenuCard({ menu, restaurantId, onEdit, onDelete, isOwner = false }) {
  const [activePromos, setActivePromos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load active promos for this menu
  useEffect(() => {
    const loadPromos = async () => {
      if (menu.id) {
        try {
          const promos = await getActivePromosForMenu(menu.id);
          setActivePromos(promos);
        } catch (error) {
          console.error('Error loading promos:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadPromos();
  }, [menu.id]);

  // Calculate discounted price
  const calculateDiscountedPrice = (originalPrice, promo) => {
    if (promo.discountType === 'percentage') {
      return originalPrice * (1 - promo.discountValue / 100);
    } else {
      return Math.max(0, originalPrice - promo.discountValue);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const hasActivePromo = activePromos.length > 0;
  const mainPromo = hasActivePromo ? activePromos[0] : null; // Show first active promo

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 ${hasActivePromo ? 'border-orange-200 border-l-4 border-l-orange-500' : 'border-gray-200'} transition-all hover:shadow-md`}>
      {/* Promo Badge */}
      {hasActivePromo && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 text-sm font-semibold rounded-t-xl">
          🎉 PROMO AKTIF
        </div>
      )}
      
      <div className="p-4">
        {/* Menu Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">{menu.name}</h3>
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
              {menu.category}
            </span>
          </div>
          
          {isOwner && (
            <div className="flex space-x-2 ml-2">
              <button
                onClick={() => onEdit(menu)}
                className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors"
                title="Edit Menu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button
                onClick={() => onDelete(menu)}
                className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors"
                title="Hapus Menu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Menu Image */}
        {menu.image && (
          <div className="mb-3">
            <img 
              src={menu.image} 
              alt={menu.name}
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Promo Information */}
        {hasActivePromo && mainPromo && (
          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-orange-800 font-bold text-lg">
                {formatCurrency(calculateDiscountedPrice(menu.price, mainPromo))}
              </span>
              <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                {mainPromo.discountType === 'percentage' 
                  ? `-${mainPromo.discountValue}%` 
                  : `-${formatCurrency(mainPromo.discountValue)}`
                }
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 line-through">
                {formatCurrency(menu.price)}
              </span>
              <span className="text-orange-600 font-semibold">
                Hemat {formatCurrency(menu.price - calculateDiscountedPrice(menu.price, mainPromo))}
              </span>
            </div>
            <p className="text-xs text-orange-700 mt-1">
              {mainPromo.name} • Berlaku hingga {new Date(mainPromo.endDate).toLocaleDateString('id-ID')}
            </p>
          </div>
        )}

        {/* Regular Price (if no promo) */}
        {!hasActivePromo && (
          <div className="mb-3">
            <span className="text-gray-900 font-bold text-lg">
              {formatCurrency(menu.price)}
            </span>
          </div>
        )}

        {/* Menu Description */}
        {menu.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {menu.description}
          </p>
        )}

        {/* Availability Status */}
        <div className="flex justify-between items-center">
          <span className={`inline-flex items-center text-sm ${menu.available ? 'text-green-600' : 'text-red-600'}`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${menu.available ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {menu.available ? 'Tersedia' : 'Habis'}
          </span>

          {/* Multiple Promos Indicator */}
          {activePromos.length > 1 && (
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              +{activePromos.length - 1} promo lainnya
            </span>
          )}
        </div>
      </div>
    </div>
  );
}