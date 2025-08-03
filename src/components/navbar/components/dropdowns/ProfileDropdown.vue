<template>
  <div class="profile-dropdown-wrapper">
    <VaDropdown
      v-model="isShown"
      :offset="[9, 0]"
      class="profile-dropdown"
      stick-to-edges
      trigger="click"
      @touchstart="handleTouchStart"
    >
      <template #anchor>
        <VaButton
          preset="secondary"
          color="textPrimary"
          class="profile-dropdown__button"
          @touchstart.stop="handleTouchStart"
        >
          <span class="profile-dropdown__anchor min-w-max flex items-center">
            <VaIcon name="va-person" color="#ffffff" class="mr-2" />
            <h6
              class="profile-dropdown__name text-sm font-bold text-white truncate overflow-hidden whitespace-nowrap"
            >
              {{ _useAuthStore.userProfile.username || 'User' }}
            </h6>
          </span>
        </VaButton>
      </template>
      <VaDropdownContent
        class="profile-dropdown__content md:w-60 px-0 py-4 w-full max-h-[80vh] overflow-y-auto"
        :style="{ '--hover-color': hoverColor }"
      >
        <VaList v-for="group in options" :key="group.name">
          <header v-if="group.name" class="uppercase text-[var(--va-secondary)] opacity-80 font-bold text-xs px-4">
            {{ t(`user.${group.name}`) }}
          </header>
          <VaListItem
            v-for="item in group.list"
            :key="item.name"
            class="menu-item px-4 text-base cursor-pointer h-10 touch-manipulation"
            v-bind="resolveLinkAttribute(item)"
            @click="handleItemClick(item)"
          >
            <VaIcon :name="item.icon" class="pr-1" color="secondary" />
            {{ t(`user.${item.name}`) }}
          </VaListItem>
          <VaListSeparator v-if="group.separator" class="mx-3 my-2" />
        </VaList>
      </VaDropdownContent>
    </VaDropdown>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useColors } from 'vuestic-ui';
import { useAuthStore } from '../../../../stores/auth-store';
import { AuthMiddleware } from '../../../../utils/authMiddleware';
import Swal from 'sweetalert2';

const { colors, setHSLAColor } = useColors();
const hoverColor = computed(() => setHSLAColor(colors.focus, { a: 0.1 }));

const { t } = useI18n();
const router = useRouter();
const _useAuthStore = useAuthStore();

const isShown = ref(false);

type ProfileListItem = {
  name: string;
  to?: string;
  href?: string;
  icon: string;
};

type ProfileOptions = {
  name: string;
  separator: boolean;
  list: ProfileListItem[];
};

withDefaults(
  defineProps<{
    options?: ProfileOptions[];
  }>(),
  {
    options: () => [
      {
        name: 'logout',
        separator: false,
        list: [
          {
            name: 'logout',
            to: 'login',
            icon: 'mso-logout',
          },
        ],
      },
    ],
  },
);

const handleTouchStart = (event: Event) => {
  event.preventDefault();
  isShown.value = !isShown.value;
};

const routeExists = (routeName: string) => {
  try {
    return !!router.resolve({ name: routeName }).matched.length;
  } catch (e) {
    console.error(`Route check failed for ${routeName}:`, e);
    return false;
  }
};

const handleItemClick = async (item: ProfileListItem) => {
  if (item.name === 'logout') {
    try {
      await _useAuthStore.logout();
      AuthMiddleware.clearSession();
      isShown.value = false;
      await router.push({ name: 'login' });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: t('notifications.logout_success'),
        timer: 3000,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: t('notifications.logout_failed'),
        timer: 3000,
      });
      // Fallback redirect
      window.location.href = '/auth/login';
    }
  } else if (item.to && !routeExists(item.to)) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: t('notifications.page_not_available', { page: item.name }),
      timer: 3000,
    });
  }
};

const resolveLinkAttribute = (item: ProfileListItem) => {
  return item.to && routeExists(item.to) && item.name !== 'logout'
    ? { to: { name: item.to } }
    : item.href
    ? { href: item.href, target: '_blank' }
    : {};
};
</script>

<style lang="scss">
.profile-dropdown {
  cursor: pointer;

  &__content {
    .menu-item:hover {
      background: var(--hover-color);
    }
  }

  &__anchor {
    display: inline-block;
  }

  &__button {
    touch-action: manipulation;
    padding: 0.5rem;
    min-width: 120px;
  }

  &__name {
    max-width: 150px;
    @media screen and (max-width: 480px) {
      max-width: 100px;
      font-size: 0.75rem;
    }
  }
}

.max-h-\[80vh\] {
  max-height: 80vh;
}

.overflow-y-auto {
  overflow-y: auto;
}

.h-10 {
  height: 2.5rem;
}

.touch-manipulation {
  touch-action: manipulation;
}
</style>