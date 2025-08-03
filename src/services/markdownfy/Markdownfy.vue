<!-- eslint-disable vue/no-v-html -->
<template>
  <VaCard square outlined>
    <div v-if="markdown" class="pt-4 pb-2" v-html="marked.parse(markdown)"></div>
  </VaCard>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Marked } from 'marked'

import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'

export default defineComponent({
  components: {
    // MarkdownRenderer,
  },
  props: {
    markdown: {
      type: String,
      required: true,
    },
  },
  setup() {
    const marked = new Marked(
      markedHighlight({
        emptyLangClass: 'hljs',
        langPrefix: 'hljs language-',
        highlight(code, lang, info: any) {
          console.log(code, lang, info)
          const language = hljs.getLanguage(lang) ? lang : 'plaintext'
          return hljs.highlight(code, { language }).value
        },
      }),
    )

    return {
      marked,
    }
  },

  data() {
    return {
      value: [true],
      text: '',
      currentExplanation: '',
    }
  },
})
</script>
