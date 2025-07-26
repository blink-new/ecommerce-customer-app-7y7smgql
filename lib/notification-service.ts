import { blink } from './blink';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'order_update' | 'delivery_update' | 'flash_sale' | 'price_drop' | 'review_reminder' | 'stock_alert' | 'delivery_assigned' | 'payment_success' | 'payment_failed';
  data?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

class NotificationService {
  // Send a notification to a specific user
  async sendNotification(notificationData: NotificationData) {
    try {
      const notification = await blink.db.notifications.create({
        user_id: notificationData.userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        data: JSON.stringify({
          ...notificationData.data,
          priority: notificationData.priority || 'normal',
          timestamp: new Date().toISOString(),
        }),
        is_read: false,
      });

      // In a real app, this would also send a push notification
      console.log('Notification sent:', notification);
      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send order confirmation notification
  async sendOrderConfirmation(customerId: string, orderId: string, orderAmount: number) {
    return this.sendNotification({
      userId: customerId,
      title: 'Order Confirmed! 🎉',
      message: `Your order #${orderId} has been confirmed and is being prepared.`,
      type: 'order_update',
      data: {
        order_id: orderId,
        amount: orderAmount,
        status: 'confirmed',
      },
      priority: 'high',
    });
  }

  // Send order status update
  async sendOrderStatusUpdate(customerId: string, orderId: string, status: string, message: string) {
    const statusEmojis: { [key: string]: string } = {
      confirmed: '✅',
      preparing: '👨‍🍳',
      ready: '📦',
      picked_up: '🚚',
      out_for_delivery: '🛵',
      delivered: '✅',
      cancelled: '❌',
    };

    return this.sendNotification({
      userId: customerId,
      title: `Order ${status.replace('_', ' ').toUpperCase()} ${statusEmojis[status] || ''}`,
      message,
      type: 'order_update',
      data: {
        order_id: orderId,
        status,
      },
      priority: status === 'delivered' ? 'high' : 'normal',
    });
  }

  // Send delivery assignment notification to delivery partner
  async sendDeliveryAssignment(deliveryPartnerId: string, orderId: string, pickupAddress: string, distance: number) {
    return this.sendNotification({
      userId: deliveryPartnerId,
      title: 'New Delivery Assigned 🛵',
      message: `New delivery assigned! Pickup from ${pickupAddress}. Distance: ${distance}km`,
      type: 'delivery_assigned',
      data: {
        order_id: orderId,
        pickup_address: pickupAddress,
        distance,
      },
      priority: 'urgent',
    });
  }

  // Send new order notification to seller
  async sendNewOrderToSeller(sellerId: string, orderId: string, customerName: string, amount: number) {
    return this.sendNotification({
      userId: sellerId,
      title: 'New Order Received! 📦',
      message: `You have received a new order #${orderId} worth ₹${amount.toLocaleString()} from ${customerName}.`,
      type: 'order_update',
      data: {
        order_id: orderId,
        customer: customerName,
        amount,
      },
      priority: 'urgent',
    });
  }

  // Send low stock alert to seller
  async sendLowStockAlert(sellerId: string, productName: string, currentStock: number) {
    return this.sendNotification({
      userId: sellerId,
      title: 'Low Stock Alert! ⚠️',
      message: `${productName} is running low on stock. Only ${currentStock} units remaining.`,
      type: 'stock_alert',
      data: {
        product_name: productName,
        current_stock: currentStock,
        recommended_reorder: Math.max(20, currentStock * 5),
      },
      priority: currentStock <= 5 ? 'urgent' : 'high',
    });
  }

  // Send flash sale notification
  async sendFlashSaleAlert(userId: string, productName: string, discount: number, expiresAt: string) {
    return this.sendNotification({
      userId,
      title: 'Flash Sale Alert! ⚡',
      message: `${productName} is now ${discount}% off! Limited time offer.`,
      type: 'flash_sale',
      data: {
        product_name: productName,
        discount,
        expires_at: expiresAt,
      },
      priority: 'urgent',
    });
  }

  // Send price drop notification
  async sendPriceDropAlert(userId: string, productName: string, oldPrice: number, newPrice: number) {
    const savings = oldPrice - newPrice;
    return this.sendNotification({
      userId,
      title: 'Price Drop Alert 📉',
      message: `${productName} price dropped by ₹${savings.toLocaleString()}! Now available for ₹${newPrice.toLocaleString()}`,
      type: 'price_drop',
      data: {
        product_name: productName,
        old_price: oldPrice,
        new_price: newPrice,
        savings,
      },
      priority: 'normal',
    });
  }

  // Send review reminder
  async sendReviewReminder(userId: string, orderId: string, productName: string) {
    return this.sendNotification({
      userId,
      title: 'Review Reminder ⭐',
      message: `How was your recent purchase of ${productName}? Share your experience!`,
      type: 'review_reminder',
      data: {
        order_id: orderId,
        product_name: productName,
      },
      priority: 'low',
    });
  }

  // Send payment success notification
  async sendPaymentSuccess(userId: string, orderId: string, amount: number, paymentMethod: string) {
    return this.sendNotification({
      userId,
      title: 'Payment Successful! 💳',
      message: `Payment of ₹${amount.toLocaleString()} for order #${orderId} was successful via ${paymentMethod}.`,
      type: 'payment_success',
      data: {
        order_id: orderId,
        amount,
        payment_method: paymentMethod,
      },
      priority: 'high',
    });
  }

  // Send payment failed notification
  async sendPaymentFailed(userId: string, orderId: string, amount: number, reason: string) {
    return this.sendNotification({
      userId,
      title: 'Payment Failed ❌',
      message: `Payment of ₹${amount.toLocaleString()} for order #${orderId} failed. ${reason}`,
      type: 'payment_failed',
      data: {
        order_id: orderId,
        amount,
        reason,
      },
      priority: 'urgent',
    });
  }

  // Send bulk notifications (for promotions, announcements)
  async sendBulkNotification(userIds: string[], notificationData: Omit<NotificationData, 'userId'>) {
    const promises = userIds.map(userId =>
      this.sendNotification({ ...notificationData, userId })
    );

    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Bulk notification sent: ${successful} successful, ${failed} failed`);
      return { successful, failed };
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  // Get unread notification count for a user
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const notifications = await blink.db.notifications.list({
        where: { 
          user_id: userId,
          is_read: false,
        },
      });
      return notifications?.length || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    try {
      const unreadNotifications = await blink.db.notifications.list({
        where: { 
          user_id: userId,
          is_read: false,
        },
      });

      if (unreadNotifications && unreadNotifications.length > 0) {
        const promises = unreadNotifications.map(notification =>
          blink.db.notifications.update(notification.id, { is_read: true })
        );
        await Promise.all(promises);
      }

      return unreadNotifications?.length || 0;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  // Simulate real-time order workflow notifications
  async simulateOrderWorkflow(orderId: string, customerId: string, sellerId: string, deliveryPartnerId: string) {
    try {
      // 1. Order placed - notify seller
      await this.sendNewOrderToSeller(sellerId, orderId, 'John Doe', 25999);
      
      // 2. Order confirmed - notify customer
      setTimeout(async () => {
        await this.sendOrderConfirmation(customerId, orderId, 25999);
      }, 2000);

      // 3. Order being prepared
      setTimeout(async () => {
        await this.sendOrderStatusUpdate(customerId, orderId, 'preparing', 'Your order is being prepared by the seller.');
      }, 5000);

      // 4. Order ready for pickup - assign delivery partner
      setTimeout(async () => {
        await this.sendOrderStatusUpdate(customerId, orderId, 'ready', 'Your order is ready and will be picked up soon.');
        await this.sendDeliveryAssignment(deliveryPartnerId, orderId, 'Electronics Store, Sector 18', 2.5);
      }, 8000);

      // 5. Order picked up
      setTimeout(async () => {
        await this.sendOrderStatusUpdate(customerId, orderId, 'picked_up', 'Your order has been picked up and is on the way!');
      }, 12000);

      // 6. Out for delivery
      setTimeout(async () => {
        await this.sendOrderStatusUpdate(customerId, orderId, 'out_for_delivery', 'Your order is out for delivery! Expected delivery: 2:30 PM - 4:30 PM');
      }, 15000);

      // 7. Delivered
      setTimeout(async () => {
        await this.sendOrderStatusUpdate(customerId, orderId, 'delivered', 'Your order has been delivered successfully! 🎉');
        
        // Send review reminder after 1 hour (simulated as 20 seconds)
        setTimeout(async () => {
          await this.sendReviewReminder(customerId, orderId, 'iPhone 15 Pro');
        }, 20000);
      }, 18000);

    } catch (error) {
      console.error('Error in order workflow simulation:', error);
    }
  }
}

export const notificationService = new NotificationService();