<template>
  <div class="toolbar">
    <button @click="copyJson">Copy JSON</button>
  </div>
  <div class="canvas">
    <div v-for="(img,i) in images" :key="i" class="item"
      :style="{left:img.x+'px',top:img.y+'px',width:img.width+'px',transform:`rotate(${img.rotation}deg)`}"
      @wheel.prevent="img.rotation += $event.deltaY>0?5:-5">
      <img :src="img.src" draggable="false"/>
    </div>
  </div>
</template>

<script setup>
import {ref,onMounted} from 'vue'
import interact from 'interactjs'

const images=ref([
 {src:'/images/leaf1.webp',x:100,y:80,width:180,rotation:0},
 {src:'/images/leaf2.webp',x:350,y:180,width:150,rotation:0},
])

onMounted(()=>{
 interact('.item')
 .draggable({
   listeners:{
     move(e){
       const i=e.target.__vnode.key
       images.value[i].x+=e.dx
       images.value[i].y+=e.dy
     }
   }
 })
 .resizable({
   edges:{left:true,right:true,top:true,bottom:true},
   listeners:{
     move(e){
       const i=e.target.__vnode.key
       images.value[i].width=e.rect.width
       images.value[i].x+=e.deltaRect.left
       images.value[i].y+=e.deltaRect.top
     }
   }
 })
})

function copyJson(){
 navigator.clipboard.writeText(JSON.stringify(images.value,null,2))
 alert("Copied!")
}
</script>

<style scoped>
.toolbar{position:fixed;top:10px;left:10px;z-index:1000}
.canvas{position:relative;width:1366px;height:1440px;background:#fff;overflow:hidden}
.item{position:absolute;cursor:move}
.item img{display:block;width:100%;pointer-events:none;user-select:none}
</style>