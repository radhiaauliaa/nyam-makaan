import emailjs from '@emailjs/browser';

// Initialize EmailJS
if (typeof window !== 'undefined') {
  emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY);
}

export const sendReservationConfirmation = async (reservationData) => {
  try {
    const templateParams = {
      to_name: reservationData.customerName,
      to_email: reservationData.customerEmail,
      restaurant_name: reservationData.restaurantName,
      reservation_date: reservationData.date,
      reservation_time: reservationData.time,
      reservation_guests: reservationData.guests,
      reservation_id: reservationData.id,
    };

    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
      process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
      templateParams
    );

    return { success: true, result };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

export const sendOwnerNotification = async (ownerEmail, reservationData) => {
  try {
    const templateParams = {
      to_email: ownerEmail,
      restaurant_name: reservationData.restaurantName,
      customer_name: reservationData.customerName,
      reservation_date: reservationData.date,
      reservation_time: reservationData.time,
      reservation_guests: reservationData.guests,
      customer_phone: reservationData.customerPhone,
      special_requests: reservationData.specialRequests || 'Tidak ada',
    };

    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
      process.env.NEXT_PUBLIC_EMAILJS_OWNER_TEMPLATE_ID,
      templateParams
    );

    return { success: true, result };
  } catch (error) {
    console.error('Error sending owner notification:', error);
    return { success: false, error };
  }
};