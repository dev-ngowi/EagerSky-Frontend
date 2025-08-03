<template>
  <VaDropdown :offset="[13, 0]" class="notification-dropdown" stick-to-edges :close-on-content-click="false">
    <template #anchor>
      <VaButton preset="secondary" color="textPrimary">
        <VaBadge :text="unreadCount.toString()" overlap color="danger">
          <VaIconNotification class="notification-dropdown__icon" />
        </VaBadge>
      </VaButton>
    </template>
    <VaDropdownContent class="h-full sm:max-w-[420px] sm:h-auto bg-white shadow-md rounded-lg p-4">
      <section class="sm:max-h-[320px] overflow-y-auto">
        <div class="flex justify-between items-center mb-2">
          <span class="text-lg font-bold">Notifications</span>
          <VaButton
            v-if="notifications.length > 0"
            preset="plain"
            color="success"
            size="small"
            @click="markAllAsRead"
          >
            Mark All as Read
          </VaButton>
        </div>
        <VaList v-if="notifications.length > 0" class="space-y-1 mb-2">
          <template v-for="(item, index) in notificationsWithRelativeTime" :key="item.id">
            <VaListItem class="text-base">
              <VaListItemSection icon class="mx-0 p-0">
                <VaIcon :name="item.icon" color="secondary" />
              </VaListItemSection>
              <VaListItemSection>
                <p class="text-sm font-medium cursor-pointer" @click="handleNotificationClick(item)">
                  {{ item.message || 'N/A' }}
                </p>
                <p class="text-xs text-gray-500">{{ item.updateTimestamp }}</p>
              </VaListItemSection>
              <VaListItemSection icon class="mx-1">
                <VaButton
                  preset="plain"
                  color="success"
                  icon="check_circle"
                  size="small"
                  @click="markAsRead(item.id)"
                />
              </VaListItemSection>
            </VaListItem>
            <VaListSeparator v-if="item.separator && index !== notificationsWithRelativeTime.length - 1" class="mx-3" />
          </template>
        </VaList>
        <div v-else-if="loadingNotifications" class="text-center py-2 text-sm text-gray-500">
          Loading...
        </div>
        <div v-else class="text-center py-2 text-sm text-gray-500">
          No unread notifications
        </div>
        <VaButton
          preset="plain"
          color="primary"
          class="w-full mt-2"
          :to="{ name: 'notifications' }"
          :disabled="!routeExists('notifications')"
        >
          View All Notifications
        </VaButton>
      </section>
    </VaDropdownContent>
  </VaDropdown>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import makeRequest from '../../../../services/makeRequest';
import VaIconNotification from '../../../icons/VaIconNotification.vue';
import { useRouter } from 'vue-router';

const { t, locale } = useI18n();
const router = useRouter();
const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'https://app.eagersky.co.tz';

// State
const notifications = ref<Notification[]>([]);
const loadingNotifications = ref<boolean>(false);
const displayAllNotifications = ref(false);
const baseNumberOfVisibleNotifications = 4;

// Interfaces
interface Notification {
  id: number;
  message: string;
  icon: string;
  status: string;
  type: string;
  created_at: string;
  updated_at: string;
  separator?: boolean;
  updateTimestamp: string;
  booking_id?: number;
  client_message_id?: number;
}

// Computed
const unreadCount = computed(() => notifications.value.filter(n => n.status === 'pending').length);

const notificationsWithRelativeTime = computed(() => {
  const rtf = new Intl.RelativeTimeFormat(locale.value, { style: 'short' });
  const TIME_NAMES = {
    second: 1000,
    minute: 1000 * 60,
    hour: 1000 * 60 * 60,
    day: 1000 * 60 * 60 * 24,
    week: 1000 * 60 * 60 * 24 * 7,
    month: 1000 * 60 * 60 * 24 * 30,
    year: 1000 * 60 * 60 * 24 * 365,
  };

  const getTimeName = (differenceTime: number) => {
    return Object.keys(TIME_NAMES).reduce(
      (acc, key) => (TIME_NAMES[key as keyof typeof TIME_NAMES] < differenceTime ? key : acc),
      'month',
    ) as keyof typeof TIME_NAMES;
  };

  const list = displayAllNotifications.value
    ? notifications.value
    : notifications.value.slice(0, baseNumberOfVisibleNotifications);

  return list.map((item, index) => {
    const timeDifference = Math.round(new Date().getTime() - new Date(item.created_at).getTime());
    const timeName = getTimeName(timeDifference);

    let separator = false;
    const nextItem = list[index + 1];
    if (nextItem) {
      const nextItemDifference = Math.round(new Date().getTime() - new Date(nextItem.created_at).getTime());
      const nextItemTimeName = getTimeName(nextItemDifference);
      if (timeName !== nextItemTimeName) {
        separator = true;
      }
    }

    return {
      ...item,
      updateTimestamp: rtf.format(-1 * Math.round(timeDifference / TIME_NAMES[timeName]), timeName),
      separator,
    };
  });
});

// Helper Functions
const showToast = (icon: 'success' | 'error', title: string) => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    icon,
    title,
  });
};

// Check if a route exists
const routeExists = (routeName: string) => {
  try {
    return !!router.resolve({ name: routeName }).matched.length;
  } catch (e) {
    console.error(`Route check failed for ${routeName}:`, e);
    return false;
  }
};

// API Functions
const fetchNotifications = async () => {
  loadingNotifications.value = true;
  try {
    const queryParams = new URLSearchParams({
      per_page: '10',
      status: 'pending',
    }).toString();
    const response = await makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/v1/notifications?${queryParams}`,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        Accept: 'application/json',
      },
    });
    console.log('fetchNotifications response:', response);

    if (response.status === 200) {
      let notificationData = response.data.data;
      if (!Array.isArray(notificationData)) {
        if (response.data.data && Array.isArray(response.data.data.data)) {
          notificationData = response.data.data.data;
        } else if (Array.isArray(response.data)) {
          notificationData = response.data;
        } else {
          console.warn('Unexpected response.data.data format:', response.data);
          notificationData = [];
        }
      }

      notifications.value = notificationData.map((notif: any) => ({
        id: notif.id,
        message: notif.message || 'N/A',
        icon: mapNotificationTypeToIcon(notif.type),
        status: notif.status || 'N/A',
        type: notif.type || 'N/A',
        created_at: notif.created_at || '',
        updated_at: notif.updated_at || '',
        booking_id: notif.booking_id || undefined,
        client_message_id: notif.client_message_id || undefined,
      }));
    } else {
      showToast('error', response.data?.message || 'Failed to fetch notifications');
      notifications.value = [];
    }
  } catch (error: any) {
    console.error('fetchNotifications error:', error.response?.data || error.message);
    showToast('error', error.response?.data?.message || 'Failed to fetch notifications');
    notifications.value = [];
  } finally {
    loadingNotifications.value = false;
  }
};

const debouncedFetchNotifications = debounce(fetchNotifications, 500);

const markAsRead = async (id: number) => {
  try {
    const response = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/v1/notifications/${id}/approve`,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        Accept: 'application/json',
      },
    });
    console.log('markAsRead response:', response);
    if (response.status === 200) {
      showToast('success', response.data.message || 'Notification marked as read');
      await fetchNotifications();
    } else {
      showToast('error', response.data?.message || 'Failed to mark notification as read');
    }
  } catch (error: any) {
    console.error('markAsRead error:', error.response?.data || error.message);
    showToast('error', error.response?.data?.message || 'Failed to mark notification as read');
  }
};

const markAllAsRead = async () => {
  try {
    const promises = notifications.value
      .filter(n => n.status === 'pending')
      .map(n => makeRequest({
        method: 'POST',
        url: `${API_BASE_URL}/v1/notifications/${n.id}/approve`,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          Accept: 'application/json',
        },
      }));
    await Promise.all(promises);
    showToast('success', 'All notifications marked as read');
    await fetchNotifications();
  } catch (error: any) {
    console.error('markAllAsRead error:', error.response?.data || error.message);
    showToast('error', error.response?.data?.message || 'Failed to mark all notifications as read');
  }
};

// Navigate to relevant page based on notification type
const handleNotificationClick = (notification: Notification) => {
  let routeName: string;
  if (notification.type === 'client_message' && notification.client_message_id) {
    routeName = 'client-message';
  } else if (notification.type === 'booking_created' && notification.booking_id) {
    routeName = 'BookingDetail';
  } else if (notification.type === 'booking_created') {
    routeName = 'bookings';
  } else {
    routeName = 'notifications';
  }

  if (routeExists(routeName)) {
    if (routeName === 'BookingDetail' && notification.booking_id) {
      router.push({ name: routeName, params: { id: notification.booking_id } });
    } else {
      router.push({ name: routeName });
    }
  } else {
    console.error(`Route ${routeName} not found`);
    showToast('error', t('notifications.page_not_available', { page: routeName }));
  }
};

// Map notification type to icon
const mapNotificationTypeToIcon = (type: string) => {
  const iconMap: { [key: string]: string } = {
    client_message: 'email',
    booking_created: 'calendar_today',
    property_alert: 'notifications',
    system_update: 'system_update',
    task_deadline: 'alarm',
    budget_exceeded: 'trending_up',
    team_member_added: 'group_add',
    trial_expired: 'error_outline',
    report_added: 'calendar_today',
    request_pending: 'favorite_outline',
  };
  return iconMap[type] || 'notifications';
};

// Lifecycle Hooks
fetchNotifications();
</script>

<style lang="scss" scoped>
.notification-dropdown {
  cursor: pointer;

  .notification-dropdown__icon {
    position: relative;
    display: flex;
    align-items: center;
  }

  .va-dropdown__anchor {
    display: inline-block;
  }
}

.bg-white {
  background-color: #ffffff;
}
.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.rounded-lg {
  border-radius: 0.5rem;
}
.p-4 {
  padding: 1rem;
}
.mb-2 {
  margin-bottom: 0.5rem;
}
.mt-2 {
  margin-top: 0.5rem;
}
.text-sm {
  font-size: 0.875rem;
}
.text-xs {
  font-size: 0.75rem;
}
.text-gray-500 {
  color: #6b7280;
}
.text-lg {
  font-size: 1.125rem;
}
.font-bold {
  font-weight: 700;
}
.font-medium {
  font-weight: 500;
}
.space-y-1 > :not(:last-child) {
  margin-bottom: 0.25rem;
}
.w-full {
  width: 100%;
}
</style>
