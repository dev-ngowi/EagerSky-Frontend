<template>
  <div v-if="breadcrumbItems.length > 1 || breadcrumbItems[0]?.label !== 'Dashboard'" class="flex gap-2 items-center flex-wrap">
    <VaBreadcrumbs separator=">" color="#808080" class="breadcrumbs-container">
      <VaBreadcrumbsItem
        v-for="(item, index) in breadcrumbItems"
        :key="index"
        :label="item.label"
        :to="item.hasChildren ? undefined : item.to"
        :disabled="item.hasChildren"
        :aria-label="`Navigate to ${item.label}`"
        @click="handleBreadcrumbClick(item)"
        class="breadcrumb-item"
      />
    </VaBreadcrumbs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import NavigationRoutes from '../sidebar/Admin/NavigationRoutes'
import type { INavigationRoute } from '../sidebar/navigation-types'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

type BreadcrumbNavigationItem = {
  label: string
  to: string
  hasChildren: boolean
}

const findRouteName = (name: string): string => {
  const routes = NavigationRoutes.getRoutes() || []
  const routeConfig = routes.find((r: INavigationRoute) => r.name === name)
  return routeConfig?.displayName || (name === 'dashboard' ? 'Dashboard' : '')
}

const breadcrumbItems = computed(() => {
  const result: BreadcrumbNavigationItem[] = []

  route.matched.forEach((r: any) => {
    const label = findRouteName(r.name)
    if (!label) return

    result.push({
      label,
      to: r.path,
      hasChildren: r.children?.length > 0 || false,
    })
  })

  return result
})

const handleBreadcrumbClick = (item: BreadcrumbNavigationItem) => {
  if (!item.hasChildren) {
    router.push(item.to)
  }
}
</script>

<style lang="scss" scoped>
.breadcrumbs-container {
  font-family: 'Open Sans', sans-serif;
  font-size: 14px;
  color: #495057;
  padding: 4px 0;
  display: flex;
  flex-wrap: wrap;

  @media screen and (max-width: 768px) {
    font-size: 13px;
    padding: 2px 0;
  }

  @media screen and (max-width: 480px) {
    font-size: 12px;
  }
}

.breadcrumb-item {
  color: #6c757d;
  transition: color 0.2s;

  &:hover {
    color: #007bff;
  }
}

.va-breadcrumbs__item--active {
  color: #007bff;
  font-weight: 600;
}

.va-breadcrumbs__separator {
  color: #6c757d;
  margin: 0 8px;

  @media screen and (max-width: 480px) {
    margin: 0 4px;
  }
}
</style>