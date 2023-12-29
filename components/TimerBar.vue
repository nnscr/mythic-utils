<script setup lang="ts">
const props = defineProps<{
  time: DungeonTime;
  dungeon: DungeonDefinition;
}>();

const plus1 = 100;
const plus2 = (100 / props.dungeon.plus1) * props.dungeon.plus2;
const plus3 = (100 / props.dungeon.plus1) * props.dungeon.plus3;

const actual = computed(
  () => (100 / props.dungeon.plus1) * props.time.duration
);

const inTime = computed(() => props.time.duration <= props.dungeon.plus1);

function setTime(event: MouseEvent) {
  const rect = bar.value.getBoundingClientRect();
  const x = event.clientX - rect.left;

  const percent = x / rect.width;
  const duration = Math.floor(props.dungeon.plus1 * percent);

  props.time.duration = Math.min(props.dungeon.plus1, Math.max(0, duration));
}

const bar = ref<HTMLDivElement>(null!);
const dragging = ref(false);

useEventListener(document, "mousemove", (event) => {
  if (!dragging.value) {
    return;
  }

  drag(event);
});

useEventListener(document, "mouseup", () => {
  dragging.value = false;
});

function startDragging(event: MouseEvent) {
  dragging.value = true;

  event.preventDefault();
  event.stopImmediatePropagation();
}

function drag(event: MouseEvent) {
  setTime(event);

  event.preventDefault();
  event.stopImmediatePropagation();
}
</script>

<template>
  <div class="grow">
    <div class="flex flex-row items-center gap-3 text-right relative h-6">
      <div
        class="absolute top-0 pr-3"
        :style="{ width: `${plus3}%` }"
        @click="time.duration = dungeon.plus3"
      >
        +3
      </div>
      <div
        class="absolute top-0 pr-3"
        :style="{ width: `${plus2}%` }"
        @click="time.duration = dungeon.plus2"
      >
        +2
      </div>
      <div
        class="absolute top-0 pr-3"
        :style="{ width: `${plus1}%` }"
        @click="time.duration = dungeon.plus1"
      >
        +1
      </div>
    </div>

    <div
      class="h-6 grow text-white relative"
      @click="setTime($event)"
      @mousedown="startDragging($event)"
      ref="bar"
    >
      <div
        class="absolute top-0 text-sm bg-lime-900 rounded text-right px-1 shadow-lg"
        :style="{ width: `${plus1}%` }"
      >
        {{ formatSeconds(dungeon.plus1) }}
      </div>

      <div
        class="absolute top-0 text-sm bg-lime-700 rounded text-right px-1 shadow-lg"
        :style="{ width: `${plus2}%` }"
      >
        {{ formatSeconds(dungeon.plus2) }}
      </div>

      <div
        class="absolute top-0 text-sm bg-lime-500 rounded text-right px-1 shadow-lg"
        :style="{ width: `${plus3}%` }"
      >
        {{ formatSeconds(dungeon.plus3) }}
      </div>

      <div
        v-if="inTime"
        class="absolute top-0 w-1 h-7 -mt-1 bg-white rounded shadow-lg -ml-1"
        :style="{ left: `${actual}%` }"
      ></div>
    </div>
  </div>
</template>