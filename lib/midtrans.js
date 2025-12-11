import midtransClient from 'midtrans-client';

// Create Snap API instance
let snap = null;

if (typeof window === 'undefined') {
  // Server-side only
  snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
  });
}

export const createPayment = async (orderDetails) => {
  try {
    const parameter = {
      transaction_details: {
        order_id: orderDetails.orderId,
        gross_amount: orderDetails.amount,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: orderDetails.customerName,
        email: orderDetails.customerEmail,
        phone: orderDetails.customerPhone,
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
        error: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/error`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/pending`,
      },
    };

    const transaction = await snap.createTransaction(parameter);
    return {
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    };
  } catch (error) {
    console.error('Error creating payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const handlePaymentNotification = async (notification) => {
  try {
    const statusResponse = await snap.transaction.notification(notification);
    
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    // Update reservation status based on payment status
    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        // TODO: Update reservation status to 'payment_challenge'
        return 'payment_challenge';
      } else if (fraudStatus === 'accept') {
        // TODO: Update reservation status to 'paid'
        return 'paid';
      }
    } else if (transactionStatus === 'settlement') {
      // TODO: Update reservation status to 'paid'
      return 'paid';
    } else if (transactionStatus === 'deny' || 
               transactionStatus === 'expire' || 
               transactionStatus === 'cancel') {
      // TODO: Update reservation status to 'payment_failed'
      return 'payment_failed';
    }

    return transactionStatus;
  } catch (error) {
    console.error('Error handling payment notification:', error);
    throw error;
  }
};