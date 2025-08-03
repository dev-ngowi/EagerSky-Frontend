<template>
  <div class="program_data">
    <h6 class="page-title font-bold">Web development</h6>
    <span class="program_description">Description here</span>
    <div class="program_status">
      <h5>10 Lesson(s)</h5>
      <VaProgressBar :model-value="50" size="1.5rem" color="primary" content-inside show-percent />
    </div>
  </div>

  <EnrolledProgramWeekData />
</template>

<script lang="ts">
// import EnrolledProgramWeekData from './EnrolledProgramWeekData.vue'
export default {
  components: {
    // EnrolledProgramWeekData,
  },
}
</script>

<style scoped>
.program_data {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding-top: 15px;
}

.program_description {
  font-size: 14px;
  color: #6c757d;
}
</style>
