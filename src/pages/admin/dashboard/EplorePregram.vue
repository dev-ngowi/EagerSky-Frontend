<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
    <div v-for="program in programs" :key="program.id" class="program-card w-full h-full flex flex-col">
      <div class="relative">
        <img class="w-full h-64 object-cover rounded-t-lg" :src="program.image" :alt="program.name" />
      </div>
      <div class="p-4 bg-white rounded-b-lg shadow-md flex-grow flex flex-col justify-between">
        <h2 class="text-xl font-bold mb-2">{{ program.name }}</h2>
        <p class="mb-4 line-clamp-3 overflow-hidden">{{ program.description }}</p>
        <div class="flex flex-row gap-2 mt-auto">
          <VaButton class="w-full" @click="goToProgramDetails(program.id)"> Enroll Free </VaButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ExplorePregram',

  props: {
    programs: {
      type: Array as () => any[],
      required: true,
    },
  },
  methods: {
    goToProgramDetails(programId: string | number) {
      this.$router.push({ name: 'program-details', params: { id: programId } })
    },
  },
}
</script>

<style lang="scss" scoped>
.nav-item {
  display: flex;
  flex-direction: column;
  padding: var(--va-collapse-padding);
  transition: all 0.2s ease-in;

  &:hover {
    background-color: var(--va-background-element);
  }
}
</style>
