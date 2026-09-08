<script setup lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'
import { LANGUAGES, languageLabel } from './code-block'

// Vue NodeView for the `codeBlock` node (see ./code-block.ts): a syntax-
// highlighted panel with a language picker in its header bar.
const props = defineProps(nodeViewProps)

const currentLabel = computed(() => languageLabel(props.node.attrs.language))
const languageClass = computed(() =>
  props.node.attrs.language ? `language-${props.node.attrs.language}` : undefined,
)

function selectLanguage(id: string | null) {
  props.updateAttributes({ language: id })
}
</script>

<template>
  <NodeViewWrapper as="pre" class="code-block">
    <div class="code-block__bar" contenteditable="false">
      <button
        type="button"
        class="code-block__lang"
        aria-haspopup="listbox"
        @mousedown.prevent
      >
        <span>{{ currentLabel }}</span>
        <v-icon icon="chevron-down" size="16" />
        <v-menu activator="parent" location="bottom start">
          <v-list density="compact" max-height="320">
            <v-list-item
              v-for="lang in LANGUAGES"
              :key="lang.id ?? '__plain__'"
              :active="lang.id === props.node.attrs.language"
              @click="selectLanguage(lang.id)"
            >
              {{ lang.label }}
            </v-list-item>
          </v-list>
        </v-menu>
      </button>
    </div>
    <NodeViewContent as="code" :class="languageClass" />
  </NodeViewWrapper>
</template>
