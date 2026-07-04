<template>
  <div class="toolbar">
    <button @click="copyJson">Copy JSON</button>
  </div>

  <div class="canvas">
    <div
      v-for="(img, i) in images"
      :key="i"
      class="item"
      :data-index="i"
      :style="{
        left: img.x + 'px',
        top: img.y + 'px',
        width: img.width + 'px',
        transform: `rotate(${img.rotation}deg)`
      }"
      @wheel.prevent="rotate(i, $event)"
    >
      <img :src="img.src" draggable="false" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import interact from "interactjs";

const images = ref([
  {
    src: "/images/image1.png",
    x: 100,
    y: 100,
    width: 180,
    rotation: 0,
  },
  {
    src: "/images/image2.png",
    x: 400,
    y: 200,
    width: 150,
    rotation: 0,
  },
   {
    src: "/images/image3.png",
    x: 400,
    y: 200,
    width: 150,
    rotation: 0,
  },
   {
    src: "/images/image4.png",
    x: 400,
    y: 200,
    width: 150,
    rotation: 0,
  },
   {
    src: "/images/image5.png",
    x: 400,
    y: 200,
    width: 150,
    rotation: 0,
  },
  {
    src: "/images/image1.png",
    x: 100,
    y: 100,
    width: 180,
    rotation: 0,
  },
  {
    src: "/images/image1.png",
    x: 100,
    y: 100,
    width: 180,
    rotation: 0,
  },
   
]);

function rotate(index, event) {
  images.value[index].rotation += event.deltaY > 0 ? 5 : -5;
}

onMounted(() => {
  interact(".item")
    .draggable({
      listeners: {
        move(event) {
          const i = Number(event.target.dataset.index);

          images.value[i].x += event.dx;
          images.value[i].y += event.dy;

          event.target.style.left = images.value[i].x + "px";
          event.target.style.top = images.value[i].y + "px";
        },
      },
    })
    .resizable({
      edges: {
        left: true,
        right: true,
        top: true,
        bottom: true,
      },
      listeners: {
        move(event) {
          const i = Number(event.target.dataset.index);

          images.value[i].width = event.rect.width;

          images.value[i].x += event.deltaRect.left;
          images.value[i].y += event.deltaRect.top;
        },
      },
    });
});

function copyJson() {
  navigator.clipboard.writeText(
    JSON.stringify(images.value, null, 2)
  );
  alert("Copied!");
}
</script>

<style scoped>
.toolbar {
  position: fixed;
  top: 15px;
  left: 15px;
  z-index: 1000;
}

.canvas {
  position: relative;
  width: 1366px;   /* or whatever your desktop width is */
  height: 1649px;
  overflow: hidden;
  background: white;
}

.item {
  position: absolute;
  cursor: move;
  user-select: none;
}

.item img {
  width: 100%;
  display: block;
  pointer-events: none;
}
</style>